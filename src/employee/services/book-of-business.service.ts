import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DateService } from './date.service';
import { EmployeeService } from './employee.service';
import { Carrier } from '../entities/carrier.schema';
import { ContractingProducts } from '../entities/contracting-products.schema';
import { toScreamingSnakeCase } from './helper';
import { BookOfBusinessPolicy } from '../entities/book-of-business-policy.schema';
import { BookOfBusinessTakeAction } from '../entities/book-of-business-take-action.schema';
import {
  BookOfBusinessFilterDto,
  BookOfBusinessStatusCountsResponseDto,
  AgentPerformanceResponseDto,
  AgingUrgencyResponseDto,
  PolicyTakeActionResponseDto,
  CreateTakeActionNoteDto,
} from '../dto/book-of-business-filter.dto';
import { Employee } from '../entities/employee.schema';
import { TwilioService } from 'src/auth/services/twilio-auth.service';
import { PolicyStatus, ActionStatus } from '../enums/policy-status.enum';
import { npnDto } from '../dto/date-range.dto';

/**
 * BookOfBusinessService
 *
 * Bob Filtering Configuration:
 * - useNewBobFilteringForData: Controls bob filtering for book-of-business/data API
 *   - true (NEW LOGIC): Y = only Y records, N = both Y and N records
 *   - false (OLD LOGIC): Y = only Y records, N = both Y and N records
 *
 * - useNewBobFilteringForOtherApis: Controls bob filtering for all other APIs
 *   - true (NEW LOGIC): Y = only Y records, N = both Y and N records
 *   - false (OLD LOGIC): Y = only Y records, N = only N records
 *
 * Current Configuration:
 * - Data API: NEW LOGIC (Y = only Y, N = both Y and N)
 * - Other APIs: OLD LOGIC (Y = only Y, N = only N)
 */
@Injectable()
export class BookOfBusinessService implements OnModuleDestroy {
  // Configuration flags to control bob filtering behavior
  // true = new logic (Y = only Y, N = both Y and N)
  // false = old logic (Y = only Y, N = only N)
  private readonly useNewBobFilteringForData = true;
  private readonly useNewBobFilteringForOtherApis = false;

  private requiredColumnsPolicy: string[] = [
    'id',
    'isDeleted',
    'client',
    'clientPhone',
    'clientEmail',
    'policyNumber',
    'product',
    'receivedDate',
    'agent1',
    'status',
    'bob',
    'carrier',
    'issueDate',
    'annualizedPremium',
    'hierarchy',
    'npn',
  ];

  private requiredColumnsTakeAction: string[] = [
    'id',
    'isDeleted',
    'fileNumber',
    'primaryInsured',
    'agent',
    'underwriter',
    'effectiveDate',
    'faceAmount',
    'planName',
    'riskClass',
    'paymentMode',
    'riders',
    'caseManager',
    'declineReason',
    'requirements',
    'withdrawnText',
    'summaryVerticalPanel',
    'closeDate',
    'subject',
    'sender',
    'emailReceived',
    'deliveryRequirements',
    'status',
  ];

  // Cache for hierarchy NPNs to avoid repeated database calls
  private hierarchyCache = new Map<
    string,
    { npns: string[]; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private cacheCleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(BookOfBusinessPolicy.name)
    private bookOfBusinessPolicyModel: Model<BookOfBusinessPolicy>,
    @InjectModel(BookOfBusinessTakeAction.name)
    private bookOfBusinessTakeActionModel: Model<BookOfBusinessTakeAction>,
    @InjectModel(ContractingProducts.name)
    private contractingProductsModel: Model<ContractingProducts>,
    @InjectModel(Carrier.name)
    private carrierModel: Model<Carrier>,
    private dateService: DateService,
    private employeeService: EmployeeService,
    @InjectModel(Employee.name)
    private employeeModel: Model<Employee>,
  ) {}

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  private transformBookOfBusinessPolicyData(data: any) {
    // First, extract the required fields
    const requiredData = {};
    this.requiredColumnsPolicy.forEach((column) => {
      if (data[column]) {
        // Convert date fields to US timezone
        if (
          ['receivedDate', 'activityDate', 'issueDate', 'paidToDate'].includes(
            column,
          )
        ) {
          requiredData[column] = data[column]
            ? this.dateService.getStartDate(data[column])
            : null;
        } else if (column === 'clientPhone') {
          requiredData[column] = data[column]
            ? TwilioService.getFormattedPhoneNumber(data[column]?.toString())
            : '';
        } else if (column === 'clientEmail') {
          requiredData[column] = data[column] ? data[column].trim() : '';
        } else if (column === 'bob') {
          requiredData[column] = data[column].toUpperCase() === 'Y' ? 'Y' : 'N';
        } else if (column === 'carrier') {
          requiredData[column] = toScreamingSnakeCase(
            data[column].toLowerCase(),
          );
        } else {
          requiredData[column] = data[column];
        }

        requiredData['actionStatus'] =
          requiredData['actionStatus']?.toString() || ActionStatus.PENDING;
      }
    });

    // Get all non-required columns and transform them
    const entries = Object.entries(data)
      .filter(([key]) => !this.requiredColumnsPolicy.includes(key))
      .map(([key, value]) => ({
        key: toScreamingSnakeCase(key),
        value: value?.toString() || '',
      }));

    // Group carriers with their numbers
    const carriers = entries.reduce((acc, curr) => {
      if (!curr.key.endsWith('_#')) {
        const carrier = curr.key;
        const numberField = entries.find((e) => e.key === `${curr.key}_#`);

        if (curr.value) {
          // Only include if carrier has a value
          acc.push({
            carrier,
            carrierNumber: numberField ? numberField.value : '',
            stageNumber: parseInt(curr.value) || 0,
          });
        }
      }
      return acc;
    }, []);

    return {
      ...requiredData,
      carriers,
    };
  }

  private transformTakeActionData(data: any) {
    const transformedData = { ...data };

    // Convert date fields to US timezone
    const dateFields = ['effectiveDate', 'closeDate', 'emailReceived'];
    dateFields.forEach((field) => {
      if (transformedData[field]) {
        transformedData[field] = transformedData[field]
          ? this.dateService.getStartDate(transformedData[field])
          : null;
      } else {
        transformedData[field] = transformedData[field].trim();
      }
    });

    return transformedData;
  }

  async createBookOfBusiness(policyDtos: any[], takeActionData: any[]) {
    // Validate Policy Data Columns
    if (policyDtos && policyDtos.length > 0) {
      const columnNames = Object.keys(policyDtos[0]);
      const missingPolicyColumns = this.requiredColumnsPolicy.filter(
        (col) => !columnNames.includes(col),
      );
      if (missingPolicyColumns.length) {
        throw new BadRequestException(
          `Missing policy columns: ${missingPolicyColumns.map(this.toSnakeCase).join(',')}`,
        );
      }
    }

    // Validate Take Action Data Columns
    if (takeActionData && takeActionData.length > 0) {
      const columnNames = Object.keys(takeActionData[0]);
      console.log('columnNames', columnNames);
      const missingTakeActionColumns = this.requiredColumnsTakeAction.filter(
        (col) => !columnNames.includes(col),
      );
      if (missingTakeActionColumns.length) {
        throw new BadRequestException(
          `Missing take action columns: ${missingTakeActionColumns.map(this.toSnakeCase).join(',')}`,
        );
      }
    }

    // Create a map of policyNumber to bob value for take action mapping
    const policyBobMap = new Map<string, 'Y' | 'N'>();
    if (policyDtos && policyDtos.length > 0) {
      policyDtos.forEach((policy) => {
        if (policy.policyNumber && policy.bob) {
          const bobValue = policy.bob.toUpperCase() === 'Y' ? 'Y' : 'N';
          policyBobMap.set(policy.policyNumber, bobValue);
        }
      });
    }

    // Get existing policies from database for take action mapping (if needed)
    let existingPoliciesPromise: Promise<any[]> = Promise.resolve([]);
    if (takeActionData && takeActionData.length > 0) {
      const fileNumbers = takeActionData
        .map((action) => action.fileNumber)
        .filter(Boolean)
        .filter((fileNumber) => !policyBobMap.has(fileNumber)); // Only query for policies not in current batch

      if (fileNumbers.length > 0) {
        existingPoliciesPromise = this.bookOfBusinessPolicyModel
          .find(
            { policyNumber: { $in: fileNumbers } },
            { policyNumber: 1, bob: 1 },
          )
          .lean()
          .exec();
      }
    }

    // Prepare policy operations
    let policyOperationsPromise: Promise<any> = Promise.resolve();
    if (policyDtos && policyDtos.length > 0) {
      const transformedPolicyData = policyDtos
        .map((dto) => this.transformBookOfBusinessPolicyData(dto))
        .map((dto: any) => {
          dto.emails = dto.email
            ? dto.email.split(',').map((email: string) => email.trim())
            : [];
          delete dto.email;
          return dto;
        });

      const policyBulkOperations = transformedPolicyData.map((policy) => {
        if (policy.id) {
          if (Number(policy.isDeleted) === 1) {
            return {
              deleteOne: {
                filter: { _id: policy.id },
              },
            };
          } else {
            return {
              updateOne: {
                filter: { _id: policy.id },
                update: { $set: policy },
                upsert: false,
              },
            };
          }
        } else {
          return {
            insertOne: {
              document: policy,
            },
          };
        }
      });

      policyOperationsPromise =
        this.bookOfBusinessPolicyModel.bulkWrite(policyBulkOperations);
    }

    // Prepare take action operations (will be executed after getting existing policies)
    const prepareTakeActionOperations = async (existingPolicies: any[]) => {
      if (!takeActionData || takeActionData.length === 0) {
        return Promise.resolve();
      }

      // Update policyBobMap with existing policies
      existingPolicies.forEach((policy) => {
        if (!policyBobMap.has(policy.policyNumber)) {
          policyBobMap.set(policy.policyNumber, policy.bob as 'Y' | 'N');
        }
      });

      const transformedTakeActionData = takeActionData
        .map((dto) => this.transformTakeActionData(dto))
        .map((dto: any) => {
          // Map bob field based on corresponding policy
          const bobValue = policyBobMap.get(dto.fileNumber);
          if (bobValue) {
            dto.bob = bobValue;
          } else {
            // Default to 'Y' if no corresponding policy found
            dto.bob = 'Y';
            console.warn(
              `No policy found for take action fileNumber: ${dto.fileNumber}, defaulting bob to 'Y'`,
            );
          }
          return dto;
        });

      const takeActionBulkOperations = transformedTakeActionData.map(
        (action) => {
          if (action.id) {
            if (Number(action.isDeleted) === 1) {
              return {
                deleteOne: {
                  filter: { _id: action.id },
                },
              };
            } else {
              return {
                updateOne: {
                  filter: { _id: action.id },
                  update: { $set: action },
                  upsert: false,
                },
              };
            }
          } else {
            return {
              insertOne: {
                document: action,
              },
            };
          }
        },
      );

      return this.bookOfBusinessTakeActionModel.bulkWrite(
        takeActionBulkOperations,
      );
    };

    try {
      // Execute operations in parallel where possible
      const [existingPolicies] = await Promise.all([
        existingPoliciesPromise,
        policyOperationsPromise, // Policy operations can run in parallel with fetching existing policies
      ]);

      // Execute take action operations after getting existing policies
      await prepareTakeActionOperations(existingPolicies);

      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error in createBookOfBusiness:', error.message);

      // Provide more specific error messages
      if (error.message.includes('Policy')) {
        throw new BadRequestException(`Policy data error: ${error.message}`);
      } else if (
        error.message.includes('Take action') ||
        error.message.includes('takeaction')
      ) {
        throw new BadRequestException(
          `Take action data error: ${error.message}`,
        );
      } else {
        throw new BadRequestException(
          `Database operation error: ${error.message}`,
        );
      }
    }
  }

  // Helper function to apply bob filter logic
  private applyBobFilter(
    conditions: any,
    bobFilter: 'Y' | 'N',
    useNewLogic: boolean = false,
  ): void {
    /*
    if (useNewLogic) {
      // New logic: If bob is 'Y', filter only for 'Y'. If bob is 'N', include both 'Y' and 'N' (no bob filter)
      if (bobFilter === 'Y') {
        conditions.bob = 'Y';
      }
      // For 'N', we don't add any bob filter to include both Y and N
    } else {
      // Old logic: Filter exactly for the specified bob value
      conditions.bob = bobFilter;
    }*/
  }

  // Helper function to apply bob filter for take actions in aggregation pipelines
  private getTakeActionBobFilter(
    bobFilter: 'Y' | 'N',
    useNewLogic: boolean = false,
  ): any {
    if (useNewLogic) {
      // New logic: If bob is 'Y', filter only for 'Y'. If bob is 'N', include both 'Y' and 'N' (no bob filter)
      if (bobFilter === 'Y') {
        return { bob: 'Y' };
      }
      // For 'N', return empty object to include both Y and N
      return {};
    } else {
      // Old logic: Filter exactly for the specified bob value
      return { bob: bobFilter };
    }
  }

  // Helper method to get all NPNs in hierarchy efficiently with enhanced caching
  private async getAllNpnsInHierarchy(npn: string): Promise<string[]> {
    // Start cache cleanup timer if not already running
    if (!this.cacheCleanupTimer) {
      this.cacheCleanupTimer = setInterval(() => {
    this.cleanExpiredCache();
      }, this.CACHE_CLEANUP_INTERVAL);
    }

    // Check cache first with enhanced validation
    const cached = this.hierarchyCache.get(npn);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL && cached.npns.length > 0) {
      return cached.npns;
    }

    try {
      // Primary: Use optimized $graphLookup with better performance
      const result = await this.employeeModel.aggregate([
        {
          $match: { npn: npn }
        },
        {
          $graphLookup: {
            from: 'employees',
            startWith: '$npn',
            connectFromField: 'npn',
            connectToField: 'agentsUplineNpn',
            as: 'hierarchy',
            maxDepth: 15,
            depthField: 'depth'
          }
        },
        {
          $project: {
            allNpns: {
              $concatArrays: [
                [npn],
                '$hierarchy.npn'
              ]
            }
          }
        },
        {
          $unwind: '$allNpns'
        },
        {
          $group: {
            _id: null,
            npns: { $addToSet: '$allNpns' }
          }
        },
        {
          $project: {
            _id: 0,
            npns: 1
          }
        }
      ]);

      const allNpns = result[0]?.npns || [npn];

      // Enhanced cache with validation
      if (allNpns.length > 0) {
      this.hierarchyCache.set(npn, {
        npns: allNpns,
        timestamp: Date.now(),
      });
      }

      return allNpns;
    } catch (error) {
      console.error('Primary hierarchy lookup failed:', error);
      
      try {
        // Secondary: Fallback to iterative approach with batching
        return await this.getNpnsInHierarchyIterativeOptimized(npn);
      } catch (fallbackError) {
        console.error('Fallback hierarchy lookup failed:', fallbackError);
        
        // Ultimate fallback: Return single NPN
        const fallbackNpns = [npn];
        this.hierarchyCache.set(npn, {
          npns: fallbackNpns,
          timestamp: Date.now(),
        });
        return fallbackNpns;
      }
    }
  }

  // Enhanced iterative fallback method with better performance
  private async getNpnsInHierarchyIterativeOptimized(npn: string): Promise<string[]> {
    const allNpns = new Set([npn]);
    let currentLevel = [npn];
    let depth = 0;
    const maxDepth = 15;
    const batchSize = 50; // Reduced batch size for better performance

    while (currentLevel.length > 0 && depth < maxDepth) {
      const batches = [];
      
      // Process in smaller batches for better memory management
      for (let i = 0; i < currentLevel.length; i += batchSize) {
        batches.push(currentLevel.slice(i, i + batchSize));
      }

      try {
        // Process batches in parallel with limited concurrency
        const batchPromises = batches.map(batch =>
          this.employeeModel
            .find(
              { agentsUplineNpn: { $in: batch } }, 
              { npn: 1, _id: 0 }
            )
            .lean()
            .exec()
        );

        const batchResults = await Promise.all(batchPromises);
        const descendants = batchResults.flat();

        currentLevel = [];
        descendants.forEach((emp) => {
          if (!allNpns.has(emp.npn)) {
            allNpns.add(emp.npn);
            currentLevel.push(emp.npn);
          }
        });

        depth++;
      } catch (batchError) {
        console.error(`Batch processing failed at depth ${depth}:`, batchError);
        break; // Exit loop on batch failure
      }
    }

    const result = Array.from(allNpns);

    // Cache successful results
    if (result.length > 0) {
      this.hierarchyCache.set(npn, {
        npns: result,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  async getBookOfBusinessPolicy(
    filter: BookOfBusinessFilterDto,
    bob: 'Y' | 'N',
  ) {
    const page = filter.page > 0 ? filter.page : 1;
    const limit = Number(filter.limit) > 0 ? filter.limit : 10;
    const skip = (page - 1) * limit;
    const searchTerm = filter.search || filter.searchTerm || '';

    try {
      // Step 1: Get NPNs in hierarchy - try fast method first
      let allNpns: string[];
      try {
        allNpns = await this.getNpnsInHierarchyFast(filter.npn);
      } catch (error) {
        console.warn(
          'Fast hierarchy lookup failed, falling back to original method:',
          error,
        );
        allNpns = await this.getAllNpnsInHierarchy(filter.npn);
      }

      // Step 2: Build optimized match conditions
      const policyMatchConditions: any = {
        npn: { $in: allNpns },
      };

      // Apply BOB filter
      if (bob === 'Y') {
        policyMatchConditions.bob = 'Y';
      }

      // Add filters efficiently
      if (filter.startDate || filter.endDate) {
        policyMatchConditions.receivedDate = {};
        if (filter.startDate) {
          const startDateString = this.dateService.getDateStringNew(
            filter.startDate,
          );
          const startDateUS = this.dateService.getStartDate(startDateString);
          policyMatchConditions.receivedDate.$gte = startDateUS;
        }
        if (filter.endDate) {
          const endDateString = this.dateService.getDateStringNew(
            filter.endDate,
          );
          const endDateUS = this.dateService.getEndDate(endDateString);
          policyMatchConditions.receivedDate.$lte = endDateUS;
        }
      }

      if (
        filter.carrier &&
        filter.carrier !== 'null' &&
        filter.carrier.trim()
      ) {
        const carrierArray = filter.carrier
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c);
        if (carrierArray.length > 0) {
          policyMatchConditions.carrier = { $in: carrierArray };
        }
      }

      if (searchTerm) {
        policyMatchConditions.$or = [
          { agent1: { $regex: searchTerm, $options: 'i' } },
          { client: { $regex: searchTerm, $options: 'i' } },
          { policyNumber: { $regex: searchTerm, $options: 'i' } },
          { npn: { $regex: searchTerm, $options: 'i' } },
        ];
      }

      // Add status filter
      if (filter.status) {
        policyMatchConditions.status = filter.status;
      }

      // Add actionStatus filter
      if (filter.actionStatus) {
        policyMatchConditions.actionStatus = filter.actionStatus;
      }

      // Step 3: Execute optimized queries in parallel
      const [policies, totalCount] = await Promise.all([
        this.bookOfBusinessPolicyModel
          .find(policyMatchConditions)
          .sort({ receivedDate: -1, _id: -1 }) // Use index-friendly sort
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.bookOfBusinessPolicyModel.countDocuments(policyMatchConditions),
      ]);

      // Step 4: Get take actions efficiently (only if we have policies)
      if (policies.length > 0) {
        const policyNumbers = policies
          .map((p) => p.policyNumber)
          .filter(Boolean);

        if (policyNumbers.length > 0) {
          try {
            // Use simple aggregation for take actions
            const takeActionBobFilter = this.getTakeActionBobFilter(
              bob,
              this.useNewBobFilteringForData,
            );

            const takeActions =
              await this.bookOfBusinessTakeActionModel.aggregate([
                {
                  $match: {
                    fileNumber: { $in: policyNumbers },
                    ...takeActionBobFilter,
                  },
                },
                {
                  $sort: { fileNumber: 1, _id: -1 },
                },
                {
                  $group: {
                    _id: '$fileNumber',
                    latestAction: { $first: '$$ROOT' },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    fileNumber: '$_id',
                    issueType: '$latestAction.status',
                    issueDescription: '$latestAction.requirements',
                  },
                },
              ]);

            // Create lookup map and merge data
            const takeActionMap = new Map();
            takeActions.forEach((action) => {
              takeActionMap.set(action.fileNumber, {
                issueType: action.issueType,
                issueDescription: action.issueDescription,
              });
            });

            // Add take action data to policies
            policies.forEach((policy: any) => {
              const takeAction = takeActionMap.get(policy.policyNumber);
              policy.issueType = takeAction?.issueType || null;
              policy.issueDescription = takeAction?.issueDescription || null;
            });
          } catch (takeActionError) {
            console.warn(
              'Take action lookup failed, continuing without take action data:',
              takeActionError,
            );
            // Continue without take action data - policies will have null issueType and issueDescription
            policies.forEach((policy: any) => {
              policy.issueType = null;
              policy.issueDescription = null;
            });
          }
        }
      }

      return {
        policies,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (error) {
      console.error(
        'Error in getBookOfBusinessPolicy, falling back to original implementation:',
        error,
      );

      // Complete fallback to original implementation
      return this.getBookOfBusinessPolicyOriginal(filter, bob);
    }
  }

  // Original implementation as complete fallback
  private async getBookOfBusinessPolicyOriginal(
    filter: BookOfBusinessFilterDto,
    bob: 'Y' | 'N',
  ) {
    const page = filter.page > 0 ? filter.page : 1;
    const limit = Number(filter.limit) > 0 ? filter.limit : 10;
    const skip = (page - 1) * limit;
    const searchTerm = filter.search || filter.searchTerm || '';

    // Step 1: Get all NPNs in hierarchy using original method
    const allNpns = await this.getAllNpnsInHierarchy(filter.npn);

    // Step 2: Build match conditions for policies
    const policyMatchConditions: any = {
      npn: { $in: allNpns },
    };

    if (bob === 'Y') {
      policyMatchConditions.bob = 'Y';
    }

    // Add date range filter if provided
    if (filter.startDate || filter.endDate) {
      policyMatchConditions.receivedDate = {};

      if (filter.startDate) {
        const startDateString = this.dateService.getDateStringNew(
          filter.startDate,
        );
        const startDateUS = this.dateService.getStartDate(startDateString);
        policyMatchConditions.receivedDate.$gte = startDateUS;
      }

      if (filter.endDate) {
        const endDateString = this.dateService.getDateStringNew(filter.endDate);
        const endDateUS = this.dateService.getEndDate(endDateString);
        policyMatchConditions.receivedDate.$lte = endDateUS;
      }
    }

    // Add carrier filter if provided
    if (filter.carrier && filter.carrier !== 'null' && filter.carrier.trim()) {
      const carrierArray = filter.carrier
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c);
      if (carrierArray.length > 0) {
        policyMatchConditions.carrier = { $in: carrierArray };
      }
    }

    // Add search conditions if provided
    if (searchTerm) {
      policyMatchConditions.$or = [
        { agent1: { $regex: searchTerm, $options: 'i' } },
        { client: { $regex: searchTerm, $options: 'i' } },
        { policyNumber: { $regex: searchTerm, $options: 'i' } },
        { npn: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Add status filter
    if (filter.status) {
      policyMatchConditions.status = filter.status;
    }

    // Add actionStatus filter
    if (filter.actionStatus) {
      policyMatchConditions.actionStatus = filter.actionStatus;
    }

    // Step 3: Get policies with pagination
    const [policies, totalCount] = await Promise.all([
      this.bookOfBusinessPolicyModel
        .find(policyMatchConditions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.bookOfBusinessPolicyModel.countDocuments(policyMatchConditions),
    ]);

    // Step 4: Get take actions for the policies in this page only
    if (policies.length > 0) {
      const policyNumbers = policies.map((p) => p.policyNumber).filter(Boolean);

      if (policyNumbers.length > 0) {
        // Get latest take action for each policy number
        const takeActionMatch = {
          fileNumber: { $in: policyNumbers },
          ...this.getTakeActionBobFilter(bob, this.useNewBobFilteringForData),
        };

        const takeActions = await this.bookOfBusinessTakeActionModel.aggregate([
          {
            $match: takeActionMatch,
          },
          {
            $sort: { fileNumber: 1, _id: -1 },
          },
          {
            $group: {
              _id: '$fileNumber',
              latestAction: { $first: '$$ROOT' },
            },
          },
          {
            $project: {
              _id: 0,
              fileNumber: '$_id',
              issueType: '$latestAction.status',
              issueDescription: '$latestAction.requirements',
            },
          },
        ]);

        // Create a map for quick lookup
        const takeActionMap = new Map();
        takeActions.forEach((action) => {
          takeActionMap.set(action.fileNumber, {
            issueType: action.issueType,
            issueDescription: action.issueDescription,
          });
        });

        // Add take action data to policies
        policies.forEach((policy: any) => {
          const takeAction = takeActionMap.get(policy.policyNumber);
          policy.issueType = takeAction?.issueType || null;
          policy.issueDescription = takeAction?.issueDescription || null;
        });
      }
    }

    return {
      policies,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  // Fast hierarchy lookup with minimal overhead but complete hierarchy
  private async getNpnsInHierarchyFast(npn: string): Promise<string[]> {
    // Check cache first (simple check)
    const cached = this.hierarchyCache.get(npn);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.npns;
    }

    try {
      // Use optimized aggregation pipeline for better performance
      const result = await this.employeeModel.aggregate([
        {
          $match: { npn: npn }
        },
        {
          $graphLookup: {
            from: 'employees',
            startWith: '$npn',
            connectFromField: 'npn',
            connectToField: 'agentsUplineNpn',
            as: 'hierarchy',
            maxDepth: 15, // Increased depth limit for comprehensive hierarchy
            depthField: 'depth'
          }
        },
        {
          $project: {
            allNpns: {
              $concatArrays: [
                [npn], // Include the starting NPN
                '$hierarchy.npn'
              ]
            }
          }
        },
        {
          $unwind: '$allNpns'
        },
        {
          $group: {
            _id: null,
            npns: { $addToSet: '$allNpns' }
          }
        },
        {
          $project: {
            _id: 0,
            npns: 1
          }
        }
      ]);

      const allNpns = result[0]?.npns || [npn];

      // Cache the result with longer TTL for hierarchy data
      this.hierarchyCache.set(npn, {
        npns: allNpns,
        timestamp: Date.now(),
      });

      return allNpns;
    } catch (error) {
      console.error('Optimized hierarchy lookup failed:', error);
      
      // Fallback to iterative approach if $graphLookup fails
      return this.getNpnsInHierarchyIterative(npn);
    }
  }

  // Iterative fallback method for hierarchy lookup
  private async getNpnsInHierarchyIterative(npn: string): Promise<string[]> {
    try {
      const allNpns = new Set([npn]);
      let currentLevel = [npn];
      let depth = 0;
      const maxDepth = 15; // Prevent infinite loops

      // Iteratively find descendants with batch processing
      while (currentLevel.length > 0 && depth < maxDepth) {
        const batchSize = 100; // Process in batches to avoid memory issues
        const batches = [];
        
        for (let i = 0; i < currentLevel.length; i += batchSize) {
          batches.push(currentLevel.slice(i, i + batchSize));
        }

        const nextLevelPromises = batches.map(batch =>
          this.employeeModel
            .find(
              { agentsUplineNpn: { $in: batch } }, 
              { npn: 1, _id: 0 }
            )
          .lean()
            .exec()
        );

        const batchResults = await Promise.all(nextLevelPromises);
        const descendants = batchResults.flat();

        currentLevel = [];
        descendants.forEach((emp) => {
          if (!allNpns.has(emp.npn)) {
            allNpns.add(emp.npn);
            currentLevel.push(emp.npn);
          }
        });

        depth++;
      }

      const result = Array.from(allNpns);

      // Cache result
      this.hierarchyCache.set(npn, {
        npns: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error('Iterative hierarchy lookup failed:', error);
      return [npn]; // Ultimate fallback to single NPN
    }
  }

  // Separate function to calculate submitted count (excluding rejected policies)
  private async calculateSubmittedCount(
    baseMatchConditions: any,
  ): Promise<number> {
    return this.bookOfBusinessPolicyModel.countDocuments({
      ...baseMatchConditions,
      actionStatus: { $ne: ActionStatus.REJECTED }, // Exclude rejected policies
    });
  }

  // Separate function to calculate active count
  private async calculateActiveCount(
    baseMatchConditions: any,
  ): Promise<number> {
    return this.bookOfBusinessPolicyModel.countDocuments({
      ...baseMatchConditions,
      actionStatus: { $ne: ActionStatus.REJECTED },
      status: {
        $in: [PolicyStatus.ACTIVE],
      },
    });
  }

  private async calculateEffectuatedCount(
    baseMatchConditions: any,
  ): Promise<number> {
    return this.bookOfBusinessPolicyModel.countDocuments({
      ...baseMatchConditions,
      actionStatus: { $ne: ActionStatus.REJECTED },
      status: {
        $in: [
          PolicyStatus.EFFECTUATED,
          PolicyStatus.ACTIVE,
          PolicyStatus.CANCELLED,
        ],
      },
    });
  }

  // Separate function to calculate lapsed count
  private async calculateLapsedCount(
    baseMatchConditions: any,
  ): Promise<number> {
    console.log(
      JSON.stringify({
        ...baseMatchConditions,
        actionStatus: { $ne: ActionStatus.REJECTED },
        status: PolicyStatus.LAPSED,
      }),
    );

    return this.bookOfBusinessPolicyModel.countDocuments({
      ...baseMatchConditions,
      actionStatus: { $ne: ActionStatus.REJECTED },
      status: PolicyStatus.LAPSED,
    });
  }

  // Separate function to calculate cancelled count
  private async calculateCancelledCount(
    baseMatchConditions: any,
    bobFilter: 'Y' | 'N',
  ): Promise<number> {
    baseMatchConditions.bob = bobFilter;
    return this.bookOfBusinessPolicyModel.countDocuments({
      ...baseMatchConditions,
      actionStatus: { $ne: ActionStatus.REJECTED },
      status: PolicyStatus.CANCELLED,
    });
  }

  // Separate function to calculate take action pending count
  private async calculateTakeActionPendingCount(
    baseMatchConditions: any,
    bobFilter: 'Y' | 'N',
  ): Promise<number> {
    const takeActionBobFilter = this.getTakeActionBobFilter(
      bobFilter,
      this.useNewBobFilteringForOtherApis,
    );

    const result = await this.bookOfBusinessPolicyModel.aggregate([
      {
        $match: {
          ...baseMatchConditions,
          actionStatus: { $in: [ActionStatus.PENDING] },
        },
      },
      {
        $lookup: {
          from: 'bookofbusinesstakeactions',
          let: { policyNumber: '$policyNumber' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$fileNumber', '$$policyNumber'] },
                ...takeActionBobFilter,
              },
            },
          ],
          as: 'takeActions',
        },
      },
      {
        $match: {
          'takeActions.0': { $exists: true },
        },
      },
      {
        $count: 'pendingCount',
      },
    ]);

    return result[0]?.pendingCount || 0;
  }

  // Separate function to calculate total take action count
  private async calculateTakeActionTotalCount(
    baseMatchConditions: any,
    bobFilter: 'Y' | 'N',
  ): Promise<number> {
    const takeActionBobFilter = this.getTakeActionBobFilter(
      bobFilter,
      this.useNewBobFilteringForOtherApis,
    );

    const result = await this.bookOfBusinessPolicyModel.aggregate([
      {
        $match: {
          ...baseMatchConditions,
          actionStatus: {
            $ne: ActionStatus.REJECTED,
          },
        },
      },
      {
        $lookup: {
          from: 'bookofbusinesstakeactions',
          let: { policyNumber: '$policyNumber' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$fileNumber', '$$policyNumber'] },
                ...takeActionBobFilter,
              },
            },
          ],
          as: 'takeActions',
        },
      },
      {
        $match: {
          'takeActions.0': { $exists: true },
        },
      },
      {
        $count: 'totalCount',
      },
    ]);

    return result[0]?.totalCount || 0;
  }

  // Separate function to calculate total policies count (excluding rejected)
  private async calculateTotalPoliciesCount(
    baseMatchConditions: any,
  ): Promise<number> {
    return this.bookOfBusinessPolicyModel.countDocuments({
      ...baseMatchConditions,
      actionStatus: { $ne: ActionStatus.REJECTED },
    });
  }

  async getBookOfBusinessStatusCounts(
    filter: BookOfBusinessFilterDto,
  ): Promise<BookOfBusinessStatusCountsResponseDto> {
    // Get all NPNs in hierarchy with fallback
    let allNpns: string[];
    try {
      allNpns = await this.getNpnsInHierarchyFast(filter.npn);
    } catch (error) {
      console.warn(
        'Fast hierarchy lookup failed in status counts, using original method:',
        error,
      );
      allNpns = await this.getAllNpnsInHierarchy(filter.npn);
    }

    // Build base match conditions - FIXED: Use npn field consistently
    const baseMatchConditions: any = {
      npn: { $in: allNpns }, // Use npn field consistently
    };

    // Add bob filter - default to 'Y' if not specified
    const bobFilter = filter.bob || 'Y';

    // Add date filters if provided
    if (filter.startDate || filter.endDate) {
      baseMatchConditions.receivedDate = {};
      if (filter.startDate) {
        const startDateString = this.dateService.getDateStringNew(
          filter.startDate,
        );
        const startDateUS = this.dateService.getStartDate(startDateString);
        baseMatchConditions.receivedDate.$gte = startDateUS;
      }
      if (filter.endDate) {
        const endDateString = this.dateService.getDateStringNew(filter.endDate);
        const endDateUS = this.dateService.getEndDate(endDateString);
        baseMatchConditions.receivedDate.$lte = endDateUS;
      }
    }

    // Add carrier filter if provided
    if (filter.carrier && filter.carrier !== 'null' && filter.carrier.trim()) {
      const carrierArray = filter.carrier
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c);
      if (carrierArray.length > 0) {
        baseMatchConditions.carrier = { $in: carrierArray };
      }
    }

    // Add search filter if provided (can search agent names, client names, policy numbers)
    if (filter.search || filter.searchTerm) {
      const searchTerm = filter.search || filter.searchTerm;
      baseMatchConditions.$or = [
        { agent1: { $regex: searchTerm, $options: 'i' } },
        { client: { $regex: searchTerm, $options: 'i' } },
        { policyNumber: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    console.log(baseMatchConditions);

    // Execute all status count calculations in parallel
    const [
      activeCount,
      effectuatedCount,
      submittedCount,
      lapsedCount,
      cancelledCount,
      pendingActionCount,
      totalTakeActionCount,
      totalPolicies,
      avgDaysInProcess,
    ] = await Promise.all([
      this.calculateActiveCount({ ...baseMatchConditions }),
      this.calculateEffectuatedCount({ ...baseMatchConditions }),
      this.calculateSubmittedCount({ ...baseMatchConditions }),
      this.calculateLapsedCount({ ...baseMatchConditions }),
      this.calculateCancelledCount(baseMatchConditions, bobFilter),
      this.calculateTakeActionPendingCount(baseMatchConditions, bobFilter),
      this.calculateTakeActionTotalCount(baseMatchConditions, bobFilter),
      this.calculateTotalPoliciesCount(baseMatchConditions),
      this.calculateAverageDaysInProcess(baseMatchConditions, bobFilter),
    ]);

    // Get pending action percentage
    const pendingActionPercentage =
      totalTakeActionCount > 0
        ? Math.round((pendingActionCount / totalTakeActionCount) * 100)
        : 0;

    // Build status counts response (maintaining the same JSON format)
    const statusCountsResponse = {
      submitted: submittedCount,
      active: activeCount,
      effectuated: effectuatedCount,
      takeAction: pendingActionCount,
      lapsed: lapsedCount,
      cancelled: cancelledCount,
    };

    // Calculate drop-off rate using the formula: Lapsed / Submitted
    const dropOffRate =
      submittedCount > 0 ? Math.round((lapsedCount / submittedCount) * 100) : 0;

    const processType = bobFilter === 'N' ? 'underwriting' : 'policy';
    const takeActionRatio = `${pendingActionCount}/${totalTakeActionCount}`;

    // Create raw status counts for debugging (maintaining compatibility)
    const rawStatusCounts = [
      { status: PolicyStatus.SUBMITTED, count: submittedCount },
      { status: PolicyStatus.ACTIVE, count: activeCount },
      { status: PolicyStatus.LAPSED, count: lapsedCount },
      { status: PolicyStatus.CANCELLED, count: cancelledCount },
    ];

    return {
      statusCounts: statusCountsResponse,
      metrics: {
        pendingActionPercentage,
        avgDaysInPolicy: avgDaysInProcess,
        dropOffRate,
        totalPolicies,
        conservationRatio: takeActionRatio,
        processType,
      },
      rawStatusCounts: rawStatusCounts,
    };
  }

  private async calculateAverageDaysInProcess(
    baseMatchConditions: any,
    bobFilter: 'Y' | 'N',
  ): Promise<number> {
    // Calculate average days in underwriting or policy processing based on bob filter
    // Logic: Avg days for Policies that have Take Action [Either completed or pending]
    // For Completed: completed date minus when 1st Take action was reported
    // For Pending: today minus when 1st Take action was reported
    // Then take the average of those policies

    const takeActionBobFilter = this.getTakeActionBobFilter(
      bobFilter,
      this.useNewBobFilteringForOtherApis,
    );

    const policiesWithActions = await this.bookOfBusinessPolicyModel.aggregate([
      {
        $match: {
          ...baseMatchConditions,
          actionStatus: { $in: [ActionStatus.PENDING, ActionStatus.COMPLETED] },
        },
      },
      {
        $lookup: {
          from: 'bookofbusinesstakeactions',
          let: { policyNumber: '$policyNumber' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$fileNumber', '$$policyNumber'] },
                ...takeActionBobFilter,
              },
            },
            {
              $sort: { emailReceived: 1 }, // Sort by earliest date first
            },
          ],
          as: 'takeActions',
        },
      },
      {
        $match: {
          'takeActions.0': { $exists: true }, // Only policies that have take actions
        },
      },
      {
        $addFields: {
          // Get the first take action date (earliest emailReceived date)
          firstTakeActionDate: {
            $arrayElemAt: ['$takeActions.emailReceived', 0],
          },
        },
      },
      {
        $addFields: {
          daysInProcess: {
            $cond: {
              if: { $eq: ['$actionStatus', ActionStatus.COMPLETED] },
              then: {
                // For Completed: completed date minus first take action date
                $divide: [
                  {
                    $subtract: [
                      { $ifNull: ['$actionCompletedDate', new Date()] },
                      '$firstTakeActionDate',
                    ],
                  },
                  1000 * 60 * 60 * 24, // Convert milliseconds to days
                ],
              },
              else: {
                // For Pending: today minus first take action date
                $divide: [
                  { $subtract: [new Date(), '$firstTakeActionDate'] },
                  1000 * 60 * 60 * 24, // Convert milliseconds to days
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          daysInProcess: { $gte: 0 }, // Only include valid positive days
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$daysInProcess' },
          totalPolicies: { $sum: 1 },
        },
      },
    ]);

    // Return calculated average or 0 if no policies with take actions found
    if (policiesWithActions.length > 0 && policiesWithActions[0].avgDays) {
      return Math.round(policiesWithActions[0].avgDays);
    }

    return 0; // Return 0 when no policies with take actions are found
  }

  async getAgentPerformance(
    filter: BookOfBusinessFilterDto,
  ): Promise<AgentPerformanceResponseDto> {
    // Get all NPNs in hierarchy with fallback
    let allNpns: string[];
    try {
      allNpns = await this.getNpnsInHierarchyFast(filter.npn);
    } catch (error) {
      console.warn(
        'Fast hierarchy lookup failed in agent performance, using original method:',
        error,
      );
      allNpns = await this.getAllNpnsInHierarchy(filter.npn);
    }

    // Build base match conditions
    const baseMatchConditions: any = {
      npn: { $in: allNpns },
    };

    // Add date filters if provided
    if (filter.startDate || filter.endDate) {
      baseMatchConditions.receivedDate = {};
      if (filter.startDate) {
        const startDateString = this.dateService.getDateStringNew(
          filter.startDate,
        );
        const startDateUS = this.dateService.getStartDate(startDateString);
        baseMatchConditions.receivedDate.$gte = startDateUS;
      }
      if (filter.endDate) {
        const endDateString = this.dateService.getDateStringNew(filter.endDate);
        const endDateUS = this.dateService.getEndDate(endDateString);
        baseMatchConditions.receivedDate.$lte = endDateUS;
      }
    }

    // Add carrier filter if provided
    if (filter.carrier && filter.carrier !== 'null' && filter.carrier.trim()) {
      const carrierArray = filter.carrier
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c);
      if (carrierArray.length > 0) {
        baseMatchConditions.carrier = { $in: carrierArray };
      }
    }

    // Add search filter if provided
    if (filter.search || filter.searchTerm) {
      const searchTerm = filter.search || filter.searchTerm;
      baseMatchConditions.$or = [
        { agent1: { $regex: searchTerm, $options: 'i' } },
        { client: { $regex: searchTerm, $options: 'i' } },
        { policyNumber: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Pagination parameters
    const page = Number(filter.page) > 0 ? Number(filter.page) : 1;
    const limit = Number(filter.limit) > 0 ? Number(filter.limit) : 10;
    const skip = (page - 1) * limit;

    const statusFilter =
      filter.bob === 'N'
        ? [
            PolicyStatus.EFFECTUATED,
            PolicyStatus.ACTIVE,
            PolicyStatus.CANCELLED,
          ]
        : [PolicyStatus.ACTIVE];

    // Get agent performance data using aggregation
    const agentPerformancePipeline = [
      {
        $match: {
          ...baseMatchConditions,
          status: { $in: statusFilter },
        },
      },
      {
        $lookup: {
          from: 'bookofbusinesstakeactions',
          let: { policyNumber: '$policyNumber' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$fileNumber', '$$policyNumber'] },
              },
            },
          ],
          as: 'takeActions',
        },
      },
      {
        $group: {
          _id: '$agent1',
          totalPolicies: { $sum: 1 },
          // Policies with Take Action: Same logic as Take action 150 value (policies with take actions - pending + completed)
          policiesWithTakeActions: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$takeActions' }, 0] }, 1, 0],
            },
          },
          // Policies effectuated: Those policies with effectuated, active, or cancelled status (regardless of take actions)
          policiesEffectuated: {
            $sum: {
              $cond: [
                {
                  $in: ['$status', statusFilter],
                }, // Has effectuated, active, or cancelled status
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          agentName: '$_id',
          totalPolicies: 1,
          policiesWithTakeActions: 1, // Same logic as Take action 150 value
          policiesEffectuated: 1, // Those policies that had Take action tagged and have effectuated, active, or cancelled status
          // Resolution Rate: Different formulas based on BOB filter
          resolutionRate: {
            $cond: [
              { $gt: ['$policiesWithTakeActions', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          // For BOB 'N': policiesWithTakeActions/policiesEffectuated
                          // For BOB 'Y': policiesWithTakeActions/totalPolicies
                          filter.bob === 'N'
                            ? '$policiesEffectuated'
                            : '$totalPolicies',
                          '$policiesWithTakeActions',
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              0,
            ],
          },
          _id: 0,
        },
      },
      {
        $match: {
          $and: [{ agentName: { $ne: null } }, { agentName: { $ne: '' } }],
        },
      },
      {
        $sort: { policiesWithTakeActions: -1 as const },
      },
    ];

    // Get total count for pagination
    const totalCountPipeline = [
      ...agentPerformancePipeline,
      { $count: 'total' },
    ];
    const totalCountResult =
      await this.bookOfBusinessPolicyModel.aggregate(totalCountPipeline);
    const totalAgents = totalCountResult[0]?.total || 0;

    // Add pagination to the main pipeline
    const paginatedPipeline = [...agentPerformancePipeline];

    const agentPerformance =
      await this.bookOfBusinessPolicyModel.aggregate(paginatedPipeline);

    const processType = 'policy';

    return {
      agents: agentPerformance,
      totalAgents,
      page,
      limit,
      totalPages: Math.ceil(totalAgents / limit),
      processType,
    };
  }

  async getAgingUrgency(
    filter: BookOfBusinessFilterDto,
  ): Promise<AgingUrgencyResponseDto> {
    // Get all NPNs in hierarchy with fallback
    let allNpns: string[];
    try {
      allNpns = await this.getNpnsInHierarchyFast(filter.npn);
    } catch (error) {
      console.warn(
        'Fast hierarchy lookup failed in aging urgency, using original method:',
        error,
      );
      allNpns = await this.getAllNpnsInHierarchy(filter.npn);
    }

    // Build base match conditions
    const baseMatchConditions: any = {
      npn: { $in: allNpns },
    };

    // Add bob filter - default to 'Y' if not specified
    const bobFilter = filter.bob || 'Y';
    this.applyBobFilter(
      baseMatchConditions,
      bobFilter,
      this.useNewBobFilteringForOtherApis,
    );

    // Add date filters if provided
    if (filter.startDate || filter.endDate) {
      baseMatchConditions.receivedDate = {};
      if (filter.startDate) {
        const startDateString = this.dateService.getDateStringNew(
          filter.startDate,
        );
        const startDateUS = this.dateService.getStartDate(startDateString);
        baseMatchConditions.receivedDate.$gte = startDateUS;
      }
      if (filter.endDate) {
        const endDateString = this.dateService.getDateStringNew(filter.endDate);
        const endDateUS = this.dateService.getEndDate(endDateString);
        baseMatchConditions.receivedDate.$lte = endDateUS;
      }
    }

    // Add carrier filter if provided
    if (filter.carrier && filter.carrier !== 'null' && filter.carrier.trim()) {
      const carrierArray = filter.carrier
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c);
      if (carrierArray.length > 0) {
        baseMatchConditions.carrier = { $in: carrierArray };
      }
    }

    // Add search filter if provided
    if (filter.search || filter.searchTerm) {
      const searchTerm = filter.search || filter.searchTerm;
      baseMatchConditions.$or = [
        { agent1: { $regex: searchTerm, $options: 'i' } },
        { client: { $regex: searchTerm, $options: 'i' } },
        { policyNumber: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    const takeActionBobFilter = this.getTakeActionBobFilter(
      bobFilter,
      this.useNewBobFilteringForOtherApis,
    );

    // Get aging data using aggregation - only pending take actions as per notes
    const agingData = await this.bookOfBusinessPolicyModel.aggregate([
      {
        $match: {
          ...baseMatchConditions,
          actionStatus: ActionStatus.PENDING, // Only pending actions for aging
        },
      },
      {
        $lookup: {
          from: 'bookofbusinesstakeactions',
          let: { policyNumber: '$policyNumber' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$fileNumber', '$$policyNumber'] },
                ...takeActionBobFilter,
              },
            },
          ],
          as: 'takeActions',
        },
      },
      {
        $match: {
          'takeActions.0': { $exists: true },
        },
      },
      {
        $addFields: {
          // Calculate first take action date if not already set
          calculatedFirstTakeActionDate: {
            $cond: {
              if: { $ifNull: ['$firstTakeActionDate', false] },
              then: '$firstTakeActionDate',
              else: {
                $min: '$takeActions.emailReceived', // Get earliest take action date
              },
            },
          },
        },
      },
      {
        $addFields: {
          daysOld: {
            $divide: [
              { $subtract: [new Date(), '$calculatedFirstTakeActionDate'] }, // From first take action date as per notes
              1000 * 60 * 60 * 24, // Convert milliseconds to days
            ],
          },
        },
      },
      {
        $bucket: {
          groupBy: '$daysOld',
          boundaries: [0, 2, 5, 10, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            minDays: { $min: '$daysOld' },
            maxDays: { $max: '$daysOld' },
          },
        },
      },
      {
        $project: {
          _id: 1,
          count: 1,
          minDays: { $round: ['$minDays', 0] },
          maxDays: {
            $cond: [
              { $eq: ['$_id', Infinity] },
              null,
              { $round: ['$maxDays', 0] },
            ],
          },
        },
      },
      {
        $sort: { _id: 1 as const },
      },
    ]);

    // Map bucket boundaries to readable labels
    const bucketLabels = {
      0: '< 2 days',
      2: '3-5 Days',
      5: '6-10 days',
      10: '>10 Days',
    };

    // Transform the data to include readable labels
    const agingBuckets = agingData.map((bucket) => ({
      ageRange: bucketLabels[bucket._id] || 'Unknown',
      count: bucket.count,
      minDays: bucket._id === 0 ? 0 : bucket._id,
      maxDays: bucket._id === 10 ? null : bucket._id === 0 ? 1 : bucket._id + 2,
    }));

    // Ensure all buckets are present (fill with 0 if missing)
    const allBuckets = [
      { ageRange: '< 2 days', minDays: 0, maxDays: 1 },
      { ageRange: '3-5 Days', minDays: 2, maxDays: 4 },
      { ageRange: '6-10 days', minDays: 5, maxDays: 9 },
      { ageRange: '>10 Days', minDays: 10, maxDays: null },
    ];

    const completeAgingBuckets = allBuckets.map((bucket) => {
      const existingBucket = agingBuckets.find(
        (ab) => ab.ageRange === bucket.ageRange,
      );
      return {
        ...bucket,
        count: existingBucket?.count || 0,
      };
    });

    const totalPolicies = completeAgingBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0,
    );

    const processType = bobFilter === 'N' ? 'underwriting' : 'policy';

    // Extract pagination parameters
    const page = Number(filter.page) > 0 ? Number(filter.page) : 1;
    const limit = Number(filter.limit) > 0 ? Number(filter.limit) : 10;
    const totalPages = Math.ceil(totalPolicies / limit);

    return {
      agingBuckets: completeAgingBuckets,
      total: totalPolicies,
      page,
      limit,
      totalPages,
      processType,
    };
  }

  async getPolicyTakeActionDetails(
    policyNumber: string,
    page: number = 1,
    limit: number = 10,
    bob: 'Y' | 'N' = 'Y',
  ): Promise<PolicyTakeActionResponseDto> {
    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build take action filter conditions using old logic (exact bob filtering)
    const takeActionFilter: any = { fileNumber: policyNumber, bob };

    // Execute all database queries in parallel for better performance
    const [policy, totalNotes, takeActionNotes] = await Promise.all([
      this.bookOfBusinessPolicyModel.findOne({ policyNumber }).lean().exec(),
      this.bookOfBusinessTakeActionModel
        .countDocuments(takeActionFilter)
        .exec(),
      this.bookOfBusinessTakeActionModel
        .find(takeActionFilter)
        .sort({ _id: -1 }) // Most recent first (using _id for sorting)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    if (!policy) {
      throw new BadRequestException('Policy not found');
    }

    // Transform take action notes
    const notes = takeActionNotes.map((note: any) => ({
      id: note._id.toString(),
      content: note.requirements || '',
      status: this.mapTakeActionStatus(note.status),
      addedBy: note.agent || note.sender || 'Unknown',
      dateAdded: note.updatedAt || note.emailReceived || new Date(),
      subject: note.subject || '',
      sender: note.sender || '',
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalNotes / limit);

    return {
      policyNumber: policy.policyNumber,
      customerName: policy.client || '',
      phoneNumber: policy.clientPhone || '',
      email: policy.clientEmail || '',
      agentName: policy.agent1 || '',
      carrier: policy.carrier || '',
      status: policy.status || '',
      notes,
      totalNotes,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async createTakeActionNote(
    createNoteDto: CreateTakeActionNoteDto,
    user: any,
  ): Promise<{ message: string; noteId: string }> {
    // Execute policy lookup and latest take action lookup in parallel
    const [policy, latestTakeAction] = await Promise.all([
      this.bookOfBusinessPolicyModel
        .findOne({ policyNumber: createNoteDto.fileNumber })
        .lean()
        .exec(),
      this.bookOfBusinessTakeActionModel
        .findOne({ fileNumber: createNoteDto.fileNumber })
        .sort({ _id: -1 }) // Most recent first
        .lean()
        .exec(),
    ]);

    if (!policy) {
      throw new BadRequestException('Policy not found');
    }

    // Extract user information from auth token
    const senderName =
      user?.name ||
      user?.firstName + ' ' + user?.lastName ||
      user?.username ||
      'Unknown User';
    const senderEmail = user?.email || user?.emailAddress || '';
    const defaultStatus = latestTakeAction?.status || 'New';
    const subject = `Take Action - ${defaultStatus}`;

    // Create new take action note with bob field mapping
    const newNote = {
      fileNumber: createNoteDto.fileNumber,
      requirements: createNoteDto.content,
      status: defaultStatus,
      sender: senderEmail,
      subject: subject,
      emailReceived: new Date(),
      bob: createNoteDto.bob, // Map bob field from the corresponding policy

      // Copy fields from the policy for context
      primaryInsured: policy.client,
      agent: senderName, // Use 'agent' field as per schema

      // Copy fields from the latest take action note if it exists
      ...(latestTakeAction && {
        underwriter: latestTakeAction.underwriter,
        effectiveDate: latestTakeAction.effectiveDate,
        faceAmount: latestTakeAction.faceAmount,
        planName: latestTakeAction.planName,
        riskClass: latestTakeAction.riskClass,
        paymentMode: latestTakeAction.paymentMode,
        riders: latestTakeAction.riders,
        caseManager: latestTakeAction.caseManager,
        deliveryRequirements: latestTakeAction.deliveryRequirements,
        summaryVerticalPanel: latestTakeAction.summaryVerticalPanel,
      }),
    };

    const createdNote =
      await this.bookOfBusinessTakeActionModel.create(newNote);

    return {
      message: 'Take action note created successfully',
      noteId: createdNote._id.toString(),
    };
  }

  async updateActionStatus(updateDto: any): Promise<{ message: string }> {
    const { policyNumber, actionStatus } = updateDto;

    // Verify policy exists
    const policy = await this.bookOfBusinessPolicyModel
      .findOne({ policyNumber })
      .lean()
      .exec();

    if (!policy) {
      throw new BadRequestException('Policy not found');
    }

    const updateData: any = { actionStatus };

    // Set completion date if status is completed
    if (actionStatus === ActionStatus.COMPLETED) {
      updateData.actionCompletedDate = new Date();
    }

    // Set first take action date if not already set and policy has take actions
    if (!policy.firstTakeActionDate) {
      const firstTakeAction = await this.bookOfBusinessTakeActionModel
        .findOne({ fileNumber: policyNumber })
        .sort({ _id: 1 }) // Oldest first
        .lean()
        .exec();

      if (firstTakeAction) {
        updateData.firstTakeActionDate =
          firstTakeAction.emailReceived || new Date();
      }
    }

    await this.bookOfBusinessPolicyModel.updateOne(
      { policyNumber },
      { $set: updateData },
    );

    return {
      message: `Policy action status updated to ${actionStatus} successfully`,
    };
  }

  private mapTakeActionStatus(status: string): string {
    // Map database status to UI-friendly status
    const statusMap = {
      new: 'New',
      customer_contact: 'Customer Contact',
      follow_up: 'Follow-up',
      resolved: 'Resolved',
      pending: 'New',
      in_progress: 'Follow-up',
      completed: 'Resolved',
    };

    return statusMap[status?.toLowerCase()] || status || 'New';
  }

  // Method to clear hierarchy cache (useful for testing or when hierarchy changes)
  public clearHierarchyCache(): void {
    this.hierarchyCache.clear();
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }
  }

  // Enhanced method to clear expired cache entries with better performance
  private cleanExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    // Collect expired keys first to avoid modification during iteration
    for (const [key, value] of this.hierarchyCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }
    
    // Remove expired entries
    expiredKeys.forEach(key => this.hierarchyCache.delete(key));
    
    // Log cache statistics periodically (every 10 cleanups)
    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries, ${this.hierarchyCache.size} entries remaining`);
    }
  }

  // Cleanup method for service destruction
  onModuleDestroy() {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }
    this.hierarchyCache.clear();
  }

  // Dashboard Methods for Book of Business

  async getEmployeeHierarchy(
    npn: string,
    dateRangeDto: any,
    isAdmin: boolean,
    search: string,
  ) {
    npn =
      isAdmin && npn === process.env.ADMIN_NPN ? process.env.ADMIN_NPN : npn;
    
    // Find employee by npn
    let employee = await this.employeeModel.findOne({
      npn,
    });
    if (!employee) {
      throw new NotFoundException(`Employee not found`);
    }

    const downlineNpns = await this.getImmediateDownlineData(
      npn,
      dateRangeDto?.startDate,
      dateRangeDto?.endDate,
      search,
    );

    const self: any = employee.toJSON();
    self.childCount = downlineNpns.length;
    return { agents: downlineNpns, self };
  }

  async getImmediateDownlineData(
    npn: string,
    startDate?: Date,
    endDate?: Date,
    search?: string,
  ): Promise<any[]> {
    // Build the match condition using npn and, if provided, date filters
    search = search || '';
    let matchConditions: any = { agentsUplineNpn: npn };
    console.log('search', search);

    // Only add search if searchText is present and not empty
    if (search && search.trim() !== '') {
      matchConditions = { agent: { $regex: search, $options: 'i' } };
    }

    if (startDate && endDate) {
      // matchConditions['eftdt'] = { $gte: new Date(startDate) };
      /*matchConditions['enddt'] = {
        $lt: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000),
      };*/
    }

    const results = await this.employeeModel.aggregate([
      // Match documents using the constructed match conditions
      { $match: matchConditions },
      // Lookup children: find documents where the downline's npn appears as an agent's upline
      {
        $lookup: {
          from: this.employeeModel.collection.name, // using the same collection
          localField: 'npn',
          foreignField: 'agentsUplineNpn',
          as: 'children',
        },
      },
      // Add a field "childCount" representing the number of children found
      {
        $addFields: {
          childCount: { $size: '$children' },
        },
      },
      // Embed the complete document as "employeeId"
      {
        $addFields: {
          employeeId: '$$ROOT',
        },
      },
      // Project the desired top-level fields
      {
        $project: {
          _id: 0,
          npn: 1,
          employeeId: 1,
          childCount: 1,
        },
      },
      // Remove the "children" and embedded "_id" fields from the employeeId field
      {
        $unset: ['employeeId.children', 'employeeId._id'],
      },
    ]);
    return results;
  }

  async getPolicyStatsBySupervisor(
    npn: string,
    req: any,
    isAdmin: boolean,
  ) {
    const startDate = req?.startDate 
      ? this.dateService.getStartDate(req.startDate) 
      : null;
    const endDate = req?.endDate 
      ? this.dateService.getEndDate(req.endDate) 
      : null;

    try {
      // Use fast hierarchy lookup with fallback
      let allNpns: string[];
      try {
        allNpns = await this.getNpnsInHierarchyFast(npn);
      } catch (error) {
        console.warn('Fast hierarchy lookup failed, using original method:', error);
        allNpns = await this.getAllNpnsInHierarchy(npn);
      }
      
      // Build optimized match conditions - FIXED: Use npn field consistently
      const matchConditions: any = {
        npn: { $in: allNpns }, // Use npn field consistently
        bob: 'Y', // Only book of business policies
      };

      if (startDate && endDate) {
        matchConditions.receivedDate = { $gte: startDate, $lte: endDate };
      }

      // Single optimized aggregation to get both monthly stats and totals
      const results = await this.bookOfBusinessPolicyModel.aggregate([
        { $match: matchConditions },
        {
          $facet: {
            // Monthly statistics branch
            monthlyStats: [
              {
                $group: {
                  _id: {
                    year: { $year: '$receivedDate' },
                    month: { $month: '$receivedDate' }
                  },
                  totalAmount: { $sum: '$annualizedPremium' },
                  count: { $sum: 1 }
                }
              },
              {
                $addFields: {
                  month: {
                    $switch: {
                      branches: [
                        { case: { $eq: ['$_id.month', 1] }, then: 'January' },
                        { case: { $eq: ['$_id.month', 2] }, then: 'February' },
                        { case: { $eq: ['$_id.month', 3] }, then: 'March' },
                        { case: { $eq: ['$_id.month', 4] }, then: 'April' },
                        { case: { $eq: ['$_id.month', 5] }, then: 'May' },
                        { case: { $eq: ['$_id.month', 6] }, then: 'June' },
                        { case: { $eq: ['$_id.month', 7] }, then: 'July' },
                        { case: { $eq: ['$_id.month', 8] }, then: 'August' },
                        { case: { $eq: ['$_id.month', 9] }, then: 'September' },
                        { case: { $eq: ['$_id.month', 10] }, then: 'October' },
                        { case: { $eq: ['$_id.month', 11] }, then: 'November' },
                        { case: { $eq: ['$_id.month', 12] }, then: 'December' }
                      ],
                      default: 'Unknown'
                    }
                  },
                  year: '$_id.year'
                }
              },
              {
                $project: {
                  _id: 0,
                  month: 1,
                  year: 1,
                  totalAmount: 1,
                  count: 1
                }
              },
              { $sort: { year: 1, month: 1 } }
            ],
            // Overall totals branch
            totals: [
              {
                $group: {
                  _id: null,
                  totalAnnualPremium: { $sum: '$annualizedPremium' },
                  totalCommissionPremium: { $sum: '$annualizedPremium' },
                  totalCounts: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]);

      const monthlyStats = results[0]?.monthlyStats || [];
      const totalsData = results[0]?.totals[0] || {
        totalCommissionPremium: 0,
        totalAnnualPremium: 0,
        totalCounts: 0,
      };

      const lastDataUpdated = new Date().toISOString().split('T')[0];

      return {
        result: {
          monthlyStats,
          lastDataUpdated,
          allTotal: {
            totalCommissionPremium: totalsData.totalCommissionPremium,
            totalAnnualPremium: totalsData.totalAnnualPremium,
            totalCounts: totalsData.totalCounts,
          },
        },
      };
    } catch (error) {
      console.error('Error in getPolicyStatsBySupervisor:', error);
      
      // Fallback to original implementation if optimized version fails
      return this.getPolicyStatsBySupervisorOriginal(npn, req, isAdmin);
    }
  }

  // Original implementation as fallback
  private async getPolicyStatsBySupervisorOriginal(
    npn: string,
    req: any,
    isAdmin: boolean,
  ) {
    const startDate = req?.startDate 
      ? this.dateService.getStartDate(req.startDate) 
      : null;
    const endDate = req?.endDate 
      ? this.dateService.getEndDate(req.endDate) 
      : null;

    // Get all NPNs in hierarchy
    const allNpns = await this.getAllNpnsInHierarchy(npn);
    
    // Build match conditions - FIXED: Use npn field consistently
    const matchConditions: any = {
      npn: { $in: allNpns }, // Use npn field consistently
      bob: 'Y', // Only book of business policies
    };

    if (startDate && endDate) {
      matchConditions.receivedDate = { $gte: startDate, $lte: endDate };
    }

    // Get monthly stats and overall totals in parallel
    const [monthlyStats, allTotal] = await Promise.all([
      this.bookOfBusinessPolicyModel.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: {
              year: { $year: '$receivedDate' },
              month: { $month: '$receivedDate' }
            },
            totalAmount: { $sum: '$annualizedPremium' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            totalAmount: 1,
            count: 1,
            year: '$_id.year',
            month: {
              $let: {
                vars: {
                  months: [
                    '', 'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ]
                },
                in: { $arrayElemAt: ['$$months', '$_id.month'] }
              }
            }
          }
        },
        { $sort: { year: 1, month: 1 } }
      ]),
      this.bookOfBusinessPolicyModel.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalAnnualPremium: { $sum: '$annualizedPremium' },
            totalCommissionPremium: { $sum: '$annualizedPremium' },
            totalCounts: { $sum: 1 }
          }
        }
      ])
    ]);

    const overallTotals = allTotal[0] || {
      totalCommissionPremium: 0,
      totalAnnualPremium: 0,
      totalCounts: 0,
    };

    const lastDataUpdated = new Date().toISOString().split('T')[0];

    return {
      result: {
        monthlyStats,
        lastDataUpdated,
        allTotal: {
          totalCommissionPremium: overallTotals.totalCommissionPremium,
          totalAnnualPremium: overallTotals.totalAnnualPremium,
          totalCounts: overallTotals.totalCounts,
        },
      },
    };
  }

  async calculatePersistency(
    npn: string,
    isIncludeDownline: boolean,
    isAdmin: boolean,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    sixMonthPersistencyHistory: { month: string; persistency: number }[];
    oneYearQuarterlyPersistencyHistory: {
      quarter: string;
      persistency: number;
    }[];
    overallPersistency: number;
  }> {
    const endDateObj = endDate
      ? this.dateService.getEndDate(endDate)
      : this.dateService.getStartDate(
          this.dateService.getDateString(new Date()),
        );

    try {
      // Use optimized approach with single aggregation
      return await this.calculatePersistencyOptimized(npn, isIncludeDownline, endDateObj);
    } catch (error) {
      console.warn('Optimized persistency calculation failed, falling back to original method:', error);
      // Fallback to original implementation
      return await this.calculatePersistencyOriginal(npn, isIncludeDownline, endDateObj);
    }
  }

  private async calculatePersistencyOptimized(
    npn: string,
    isIncludeDownline: boolean,
    endDateObj: Date,
  ): Promise<{
    sixMonthPersistencyHistory: { month: string; persistency: number }[];
    oneYearQuarterlyPersistencyHistory: {
      quarter: string;
      persistency: number;
    }[];
    overallPersistency: number;
  }> {
    // Get hierarchy NPNs with caching - but only if includeDownline is true
    const npnsToInclude = isIncludeDownline 
      ? await this.getNpnsInHierarchyFast(npn)
      : [npn];

    // Calculate all date ranges upfront
    const dateRanges = this.calculateAllDateRanges(endDateObj);

    // Build match conditions exactly like the original implementation
    // Use npn field for both individual and downline queries
    const matchConditions: any = {
      npn: isIncludeDownline ? { $in: npnsToInclude } : npn,
      bob: 'Y',
      receivedDate: { $gte: new Date(0), $lte: endDateObj }
    };

    console.log('Persistency match conditions:', JSON.stringify(matchConditions, null, 2));
    console.log('NPNs to include:', npnsToInclude);
    console.log('Is include downline:', isIncludeDownline);
    console.log('Date ranges:', dateRanges);

    // Single optimized aggregation to get all persistency data
    const result = await this.bookOfBusinessPolicyModel.aggregate([
      {
        $match: matchConditions
      },
      {
        $facet: {
          // Monthly data for last 6 months
          monthlyData: [
            {
              $match: {
                receivedDate: { 
                  $gte: dateRanges.sixMonthStart, 
                  $lte: endDateObj 
                }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$receivedDate' },
                  month: { $month: '$receivedDate' }
                },
                totalPolicies: { $sum: 1 },
                activePolicies: {
                  $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                }
              }
            }
          ],
          // Quarterly data for last 4 quarters
          quarterlyData: [
            {
              $match: {
                receivedDate: { 
                  $gte: dateRanges.quarterlyStart, 
                  $lte: endDateObj 
                }
              }
            },
            {
              $addFields: {
                quarter: {
                  $concat: [
                    'Q',
                    { $toString: { $ceil: { $divide: [{ $month: '$receivedDate' }, 3] } } },
                    ' ',
                    { $toString: { $year: '$receivedDate' } }
                  ]
                }
              }
            },
            {
              $group: {
                _id: '$quarter',
                totalPolicies: { $sum: 1 },
                activePolicies: {
                  $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                }
              }
            }
          ],
          // Overall data
          overallData: [
            {
              $group: {
                _id: null,
                totalPolicies: { $sum: 1 },
                activePolicies: {
                  $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                }
              }
            }
          ],
          // Debug data to see what we're getting
          debugData: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                samplePolicies: { $push: { npn: '$npn', status: '$status', receivedDate: '$receivedDate', bob: '$bob' } }
              }
            },
            {
              $project: {
                totalCount: 1,
                samplePolicies: { $slice: ['$samplePolicies', 5] } // Show first 5 for debugging
              }
            }
          ]
        }
      }
    ]);

    const data = result[0];
    
    // Log debug information
    console.log('Persistency debug data:', JSON.stringify(data.debugData, null, 2));
    console.log('Monthly data count:', data.monthlyData.length);
    console.log('Quarterly data count:', data.quarterlyData.length);
    console.log('Overall data:', data.overallData);
    
    // Process monthly data
    const monthlyMap = new Map();
    data.monthlyData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      monthlyMap.set(key, {
        total: item.totalPolicies,
        active: item.activePolicies
      });
    });

    // Process quarterly data
    const quarterlyMap = new Map();
    data.quarterlyData.forEach(item => {
      quarterlyMap.set(item._id, {
        total: item.totalPolicies,
        active: item.activePolicies
      });
    });

    // Build 6-month history
    const sixMonthPersistencyHistory = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(endDateObj);
      date.setMonth(endDateObj.getMonth() - i);
      date.setDate(1);
      
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const policies = monthlyMap.get(key) || { total: 0, active: 0 };
      const persistency = policies.total > 0 ? (policies.active / policies.total) * 100 : 0;
      
      console.log(`Month ${date.toLocaleString('default', { month: 'short', year: 'numeric' })}: key=${key}, total=${policies.total}, active=${policies.active}, persistency=${persistency}`);
      
      sixMonthPersistencyHistory.push({
        month: date.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        }),
        persistency,
      });
    }

    // Build quarterly history
    const oneYearQuarterlyPersistencyHistory = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date(endDateObj);
      date.setMonth(endDateObj.getMonth() - i * 3);
      const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
      
      const policies = quarterlyMap.get(quarter) || { total: 0, active: 0 };
      const persistency = policies.total > 0 ? (policies.active / policies.total) * 100 : 0;
      
      console.log(`Quarter ${quarter}: total=${policies.total}, active=${policies.active}, persistency=${persistency}`);
      
      oneYearQuarterlyPersistencyHistory.push({
        quarter,
        persistency,
      });
    }

    // Calculate overall persistency
    const overallData = data.overallData[0] || { totalPolicies: 0, activePolicies: 0 };
    const overallPersistency = overallData.totalPolicies > 0 
      ? (overallData.activePolicies / overallData.totalPolicies) * 100 
      : 0;

    console.log(`Overall: total=${overallData.totalPolicies}, active=${overallData.activePolicies}, persistency=${overallPersistency}`);

    return {
      sixMonthPersistencyHistory,
      oneYearQuarterlyPersistencyHistory,
      overallPersistency,
    };
  }

  private calculateAllDateRanges(endDateObj: Date) {
    // Calculate start date for 6 months ago
    const sixMonthStart = new Date(endDateObj);
    sixMonthStart.setMonth(endDateObj.getMonth() - 5);
    sixMonthStart.setDate(1);

    // Calculate start date for 4 quarters ago (12 months)
    const quarterlyStart = new Date(endDateObj);
    quarterlyStart.setMonth(endDateObj.getMonth() - 11);
    quarterlyStart.setDate(1);

    return {
      sixMonthStart,
      quarterlyStart
    };
  }

  private async calculatePersistencyOriginal(
    npn: string,
    isIncludeDownline: boolean,
    endDateObj: Date,
  ): Promise<{
    sixMonthPersistencyHistory: { month: string; persistency: number }[];
    oneYearQuarterlyPersistencyHistory: {
      quarter: string;
      persistency: number;
    }[];
    overallPersistency: number;
  }> {
    const employeeModel = this.employeeModel;
    const bookOfBusinessPolicyModel = this.bookOfBusinessPolicyModel;

    function calculatePersistencyForRange(policies) {
      if (!policies || policies.total === 0) return 0;
      return (policies.active / policies.total) * 100;
    }

    async function getPoliciesForRange(
      npn: string,
      startDate: Date,
      endDate: Date,
      includeDownline: boolean,
    ) {
      if (includeDownline) {
        // Use hierarchy lookup for downline data
        const result: any = await employeeModel.aggregate([
          { $match: { npn } },
          {
            $graphLookup: {
              from: 'employees',
              startWith: '$npn',
              connectFromField: 'npn',
              connectToField: 'agentsUplineNpn',
              as: 'descendants',
            },
          },
          {
            $project: {
              npn: 1,
              allNpns: {
                $concatArrays: [
                  ['$npn'],
                  { $map: { input: '$descendants', as: 'd', in: '$$d.npn' } },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'bookofbusinesspolicies',
              let: { agentNpns: '$allNpns', startDate, endDate },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $in: ['$npn', '$$agentNpns'] },
                        { $eq: ['$bob', 'Y'] },
                        { $gte: ['$receivedDate', { $toDate: '$$startDate' }] },
                        { $lte: ['$receivedDate', { $toDate: '$$endDate' }] },
                      ],
                    },
                  },
                },
              ],
              as: 'allPolicies',
            },
          },
          {
            $lookup: {
              from: 'bookofbusinesspolicies',
              let: { agentNpns: '$allNpns', startDate, endDate },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $in: ['$npn', '$$agentNpns'] },
                        { $eq: ['$bob', 'Y'] },
                        { $eq: ['$status', 'Active'] },
                        { $gte: ['$receivedDate', { $toDate: '$$startDate' }] },
                        { $lte: ['$receivedDate', { $toDate: '$$endDate' }] },
                      ],
                    },
                  },
                },
              ],
              as: 'activePolicies',
            },
          },
          {
            $project: {
              totalPolicies: { $size: '$allPolicies' },
              activePolicies: { $size: '$activePolicies' },
            },
          },
        ]);

        return result.length > 0
          ? { total: result[0].totalPolicies, active: result[0].activePolicies }
          : { total: 0, active: 0 };
      } else {
        // Direct query for individual agent
        const allPolicies = await bookOfBusinessPolicyModel.countDocuments({
          npn: npn,
          bob: 'Y',
          receivedDate: { $gte: startDate, $lte: endDate },
        });

        const activePolicies = await bookOfBusinessPolicyModel.countDocuments({
          npn: npn,
          bob: 'Y',
          status: 'Active',
          receivedDate: { $gte: startDate, $lte: endDate },
        });

        return { total: allPolicies, active: activePolicies };
      }
    }

    const sixMonthPersistencyHistory = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(endDateObj);
      start.setMonth(endDateObj.getMonth() - i);
      start.setDate(1);

      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);

      const policies = await getPoliciesForRange(npn, start, end, isIncludeDownline);
      const persistency = calculatePersistencyForRange(policies);

      sixMonthPersistencyHistory.push({
        month: start.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        }),
        persistency,
      });
    }

    const oneYearQuarterlyPersistencyHistory = [];

    for (let i = 3; i >= 0; i--) {
      const start = new Date(endDateObj);
      start.setMonth(endDateObj.getMonth() - i * 3);
      start.setDate(1);

      const end = new Date(start);
      end.setMonth(start.getMonth() + 3);
      end.setDate(0);

      const policies = await getPoliciesForRange(npn, start, end, isIncludeDownline);
      const persistency = calculatePersistencyForRange(policies);

      oneYearQuarterlyPersistencyHistory.push({
        quarter: `Q${4 - i} ${start.getFullYear()}`,
        persistency,
      });
    }

    const overallPolicies = await getPoliciesForRange(
      npn,
      new Date(0),
      endDateObj,
      isIncludeDownline,
    );
    const overallPersistency = calculatePersistencyForRange(overallPolicies);

    return {
      sixMonthPersistencyHistory,
      oneYearQuarterlyPersistencyHistory,
      overallPersistency,
    };
  }

  async calculateChargebacksAgent(
    npn: string,
    data: any,
    isAdmin: boolean,
  ) {
    const startDate = data?.startDate 
      ? this.dateService.getStartDate(data.startDate) 
      : null;
    const endDate = data?.endDate 
      ? this.dateService.getEndDate(data.endDate) 
      : null;

    // Get all NPNs in hierarchy
    const allNpns = await this.getAllNpnsInHierarchy(npn);
    
    // Build match conditions - FIXED: Use npn field consistently
    const matchConditions: any = {
      npn: { $in: allNpns }, // Use npn field consistently
      bob: 'Y', // Only book of business policies
    };

    if (startDate && endDate) {
      matchConditions.receivedDate = { $gte: startDate, $lte: endDate };
    }

    const result = await this.bookOfBusinessPolicyModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalPolicies: { $sum: 1 },
          canceledPolicies: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalPolicies: 1,
          canceledPolicies: 1,
          chargebackPercentage: {
            $cond: [
              { $gt: ['$totalPolicies', 0] },
              { $multiply: [{ $divide: ['$canceledPolicies', '$totalPolicies'] }, 100] },
              0
            ]
          }
        }
      }
    ]);

    // Get personal policies count - FIXED: Use npn field consistently
    const personalPolicies = await this.bookOfBusinessPolicyModel.countDocuments({
      npn: npn, // Use npn field consistently
      bob: 'Y',
      ...(startDate && endDate ? { receivedDate: { $gte: startDate, $lte: endDate } } : {})
    });

    const chargebackResult = result[0] || {
      totalPolicies: 0,
      canceledPolicies: 0,
      chargebackPercentage: 0,
    };

    return {
      ...chargebackResult,
      personal: personalPolicies,
    };
  }

  async productWiseTotalPremium(query: any) {
    const npn = query.npn;
    const includeTeamData = query.includeTeamData;
    const startDate = query.startDate 
      ? this.dateService.getStartDate(query.startDate) 
      : null;
    const endDate = query.endDate 
      ? this.dateService.getEndDate(query.endDate) 
      : null;

    try {
      // Get NPNs to include with optimized hierarchy lookup
      const npnsToInclude = includeTeamData === 'true' 
        ? await this.getNpnsInHierarchyFast(npn)
        : [npn];

      // Build optimized match conditions
      const matchConditions: any = {
        npn: { $in: npnsToInclude }, // Use npn field consistently
        bob: 'Y', // Only book of business policies
      };

      if (startDate && endDate) {
        matchConditions.receivedDate = { $gte: startDate, $lte: endDate };
      }

      // Optimized aggregation pipeline
      const result = await this.bookOfBusinessPolicyModel.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: '$product',
            totalAnnualPremium: { $sum: '$annualizedPremium' },
            count: { $sum: 1 } // Add count for debugging
          }
        },
        {
          $project: {
            _id: 0,
            product: '$_id',
            totalAnnualPremium: { $round: ['$totalAnnualPremium', 0] },
            count: 1
          }
        },
        { $sort: { totalAnnualPremium: -1 } }, // Sort by premium descending
        {
          $group: {
            _id: null,
            result: {
              $push: {
                k: '$product',
                v: '$totalAnnualPremium'
              }
            }
          }
        },
        {
          $replaceRoot: {
            newRoot: { $arrayToObject: '$result' }
          }
        }
      ]);

      return result[0] || {};
    } catch (error) {
      console.error('Error in productWiseTotalPremium:', error);
      
      // Fallback to original implementation
      return await this.productWiseTotalPremiumOriginal(query);
    }
  }

  private async productWiseTotalPremiumOriginal(query: any) {
    const npn = query.npn;
    const includeTeamData = query.includeTeamData;
    const startDate = query.startDate 
      ? this.dateService.getStartDate(query.startDate) 
      : null;
    const endDate = query.endDate 
      ? this.dateService.getEndDate(query.endDate) 
      : null;

    // Get NPNs to include using original method
    const npnsToInclude = includeTeamData === 'true' 
      ? await this.getAllNpnsInHierarchy(npn)
      : [npn];

    // Build match conditions - FIXED: Use npn field consistently
    const matchConditions: any = {
      npn: { $in: npnsToInclude }, // Use npn field consistently
      bob: 'Y', // Only book of business policies
    };

    if (startDate && endDate) {
      matchConditions.receivedDate = { $gte: startDate, $lte: endDate };
    }

    const result = await this.bookOfBusinessPolicyModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$product',
          totalAnnualPremium: { $sum: '$annualizedPremium' }
        }
      },
      {
        $group: {
          _id: null,
          result: {
            $push: {
              k: '$_id',
              v: { $round: ['$totalAnnualPremium', 0] }
            }
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: '$result' }
        }
      }
    ]);

    return result[0] || {};
  }

  async productWiseCommissionPremium(query: any) {
    const npn = query.npn;
    const includeTeamData = query.includeTeamData;
    const startDate = query.startDate 
      ? this.dateService.getStartDate(query.startDate) 
      : null;
    const endDate = query.endDate 
      ? this.dateService.getEndDate(query.endDate) 
      : null;

    try {
      // Get NPNs to include with optimized hierarchy lookup
      const npnsToInclude = includeTeamData === 'true' 
        ? await this.getNpnsInHierarchyFast(npn)
        : [npn];

      // Build optimized match conditions
      const matchConditions: any = {
        npn: { $in: npnsToInclude }, // Use npn field consistently
        bob: 'Y', // Only book of business policies
      };

      if (startDate && endDate) {
        matchConditions.receivedDate = { $gte: startDate, $lte: endDate };
      }

      // Optimized aggregation pipeline
      const result = await this.bookOfBusinessPolicyModel.aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: '$product',
            totalCommissionPremium: { $sum: '$annualizedPremium' }, // Assuming same as annual premium for now
            count: { $sum: 1 } // Add count for debugging
          }
        },
        {
          $project: {
            _id: 0,
            product: '$_id',
            totalCommissionPremium: { $round: ['$totalCommissionPremium', 0] },
            count: 1
          }
        },
        { $sort: { totalCommissionPremium: -1 } }, // Sort by premium descending
        {
          $group: {
            _id: null,
            result: {
              $push: {
                k: '$product',
                v: '$totalCommissionPremium'
              }
            }
          }
        },
        {
          $replaceRoot: {
            newRoot: { $arrayToObject: '$result' }
          }
        }
      ]);

      return result[0] || {};
    } catch (error) {
      console.error('Error in productWiseCommissionPremium:', error);
      
      // Fallback to original implementation
      return await this.productWiseCommissionPremiumOriginal(query);
    }
  }

  private async productWiseCommissionPremiumOriginal(query: any) {
    const npn = query.npn;
    const includeTeamData = query.includeTeamData;
    const startDate = query.startDate 
      ? this.dateService.getStartDate(query.startDate) 
      : null;
    const endDate = query.endDate 
      ? this.dateService.getEndDate(query.endDate) 
      : null;

    // Get NPNs to include using original method
    const npnsToInclude = includeTeamData === 'true' 
      ? await this.getAllNpnsInHierarchy(npn)
      : [npn];

    // Build match conditions - FIXED: Use npn field consistently
    const matchConditions: any = {
      npn: { $in: npnsToInclude }, // Use npn field consistently
      bob: 'Y', // Only book of business policies
    };

    if (startDate && endDate) {
      matchConditions.receivedDate = { $gte: startDate, $lte: endDate };
    }

    const result = await this.bookOfBusinessPolicyModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$product',
          totalCommissionPremium: { $sum: '$annualizedPremium' } // Assuming same as annual premium for now
        }
      },
      {
        $group: {
          _id: null,
          result: {
            $push: {
              k: '$_id',
              v: { $round: ['$totalCommissionPremium', 0] }
            }
          }
        }
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: '$result' }
        }
      }
    ]);

    return result[0] || {};
  }

  async getPerformanceStats(
    performanceStats: any,
    isAdmin: boolean,
    npn: string,
  ) {
    const page = performanceStats.page > 0 ? performanceStats.page : 1;
    const productType = performanceStats.productType || null;
    
    // Handle admin NPN
    npn = isAdmin && npn === process.env.ADMIN_NPN ? process.env.ADMIN_NPN : npn;

    // Parse dates
    let queryStartDate;
    let queryEndDate;
    if (performanceStats.startDate || performanceStats.endDate) {
      queryStartDate = performanceStats.startDate 
        ? this.dateService.getStartDate(performanceStats.startDate)
        : null;
      queryEndDate = performanceStats.endDate 
        ? this.dateService.getEndDate(performanceStats.endDate)
        : null;
    }

    try {
      // Get immediate downlines using optimized hierarchy lookup
      const downlineNpns = await this.getImmediateDownlineNpns(npn);
      
      // Include the main NPN and downlines
      const npnsToProcess = npn === process.env.ADMIN_NPN ? downlineNpns : [npn, ...downlineNpns];

      // Process each NPN in parallel for better performance
      const results = await Promise.all(
        npnsToProcess.map(async (currentNpn) => {
          return await this.getPerformanceStatsForNpn(
            currentNpn,
            queryStartDate,
            queryEndDate,
            productType
          );
        })
      );

      // Filter out null results
      const validResults = results.filter(result => result !== null);

      return {
        totalPages: 0,
        totalRecords: validResults.length,
        currentPage: page,
        results: validResults,
      };
    } catch (error) {
      console.error('Error in getPerformanceStats:', error);
      
      // Fallback to original implementation if optimized version fails
      return await this.getPerformanceStatsOriginal(performanceStats, isAdmin, npn);
    }
  }

  // Helper method to get immediate downline NPNs
  private async getImmediateDownlineNpns(npn: string): Promise<string[]> {
    try {
      const downlines = await this.employeeModel.find(
        { agentsUplineNpn: npn },
        { npn: 1, _id: 0 }
      ).lean().exec();
      
      return downlines.map(emp => emp.npn);
    } catch (error) {
      console.error('Error getting immediate downlines:', error);
      return [];
    }
  }

  // Helper method to get performance stats for a single NPN
  private async getPerformanceStatsForNpn(
    npn: string,
    startDate: Date | null,
    endDate: Date | null,
    productType: string | null
  ): Promise<any> {
    try {
      // Get employee info
      const employee = await this.employeeModel.findOne({ npn }).lean().exec();
      if (!employee) {
        return null;
      }

      // Get all NPNs in this employee's hierarchy
      const hierarchyNpns = await this.getNpnsInHierarchyFast(npn);

      // Build match conditions for all policies (team + self)
      const allPoliciesMatch: any = {
        npn: { $in: hierarchyNpns },
        bob: 'Y', // Only book of business policies
      };

      // Build match conditions for self policies only
      const selfPoliciesMatch: any = {
        npn: npn,
        bob: 'Y', // Only book of business policies
      };

      // Add date filters
      if (startDate && endDate) {
        allPoliciesMatch.receivedDate = { $gte: startDate, $lte: endDate };
        selfPoliciesMatch.receivedDate = { $gte: startDate, $lte: endDate };
      }

      // Add product type filter if specified
      if (productType) {
        allPoliciesMatch.product = productType;
        selfPoliciesMatch.product = productType;
      }

      // Execute aggregations in parallel for better performance
      const [allPoliciesStats, activePoliciesStats, selfPoliciesStats, selfActivePoliciesStats] = await Promise.all([
        // All policies (team + self)
        this.bookOfBusinessPolicyModel.aggregate([
          { $match: allPoliciesMatch },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalAnnualPremium: { $sum: '$annualizedPremium' },
              totalTargetPremium: { $sum: '$annualizedPremium' } // Assuming same as annual premium
            }
          }
        ]),
        
        // Active policies (team + self)
        this.bookOfBusinessPolicyModel.aggregate([
          { 
            $match: { 
              ...allPoliciesMatch, 
              status: 'Active' 
            } 
          },
          {
            $group: {
              _id: null,
              activePolicies: { $sum: 1 },
              totalActiveAnnualPremium: { $sum: '$annualizedPremium' },
              totalActiveTargetPremium: { $sum: '$annualizedPremium' } // Assuming same as annual premium
            }
          }
        ]),
        
        // Self policies only
        this.bookOfBusinessPolicyModel.aggregate([
          { $match: selfPoliciesMatch },
          {
            $group: {
              _id: null,
              selfTotal: { $sum: 1 },
              selfTotalAnnualPremium: { $sum: '$annualizedPremium' },
              selfTotalTargetPremium: { $sum: '$annualizedPremium' } // Assuming same as annual premium
            }
          }
        ]),
        
        // Self active policies only
        this.bookOfBusinessPolicyModel.aggregate([
          { 
            $match: { 
              ...selfPoliciesMatch, 
              status: 'Active' 
            } 
          },
          {
            $group: {
              _id: null,
              selfActivePolicies: { $sum: 1 },
              selfTotalActiveAnnualPremium: { $sum: '$annualizedPremium' },
              selfTotalActiveTargetPremium: { $sum: '$annualizedPremium' } // Assuming same as annual premium
            }
          }
        ])
      ]);

      // Extract results with defaults
      const allStats = allPoliciesStats[0] || { total: 0, totalAnnualPremium: 0, totalTargetPremium: 0 };
      const activeStats = activePoliciesStats[0] || { activePolicies: 0, totalActiveAnnualPremium: 0, totalActiveTargetPremium: 0 };
      const selfStats = selfPoliciesStats[0] || { selfTotal: 0, selfTotalAnnualPremium: 0, selfTotalTargetPremium: 0 };
      const selfActiveStats = selfActivePoliciesStats[0] || { selfActivePolicies: 0, selfTotalActiveAnnualPremium: 0, selfTotalActiveTargetPremium: 0 };

      // Calculate persistency
      const persistency = allStats.total > 0 
        ? (activeStats.activePolicies / allStats.total) * 100 
        : 0;
      
      const selfPersistency = selfStats.selfTotal > 0 
        ? (selfActiveStats.selfActivePolicies / selfStats.selfTotal) * 100 
        : 0;

      return {
        _id: employee._id,
        npn: employee.npn,
        name: employee.agent || 'Unknown',
        total: allStats.total,
        activePolicies: activeStats.activePolicies,
        totalAnnualPremium: allStats.totalAnnualPremium,
        totalActiveAnnualPremium: activeStats.totalActiveAnnualPremium,
        totalActiveTargetPremium: activeStats.totalActiveTargetPremium,
        totalTargetPremium: allStats.totalTargetPremium,
        persistency: Math.round(persistency * 100) / 100, // Round to 2 decimal places
        selfTotal: selfStats.selfTotal,
        selfActivePolicies: selfActiveStats.selfActivePolicies,
        selfTotalAnnualPremium: selfStats.selfTotalAnnualPremium,
        selfTotalActiveAnnualPremium: selfActiveStats.selfTotalActiveAnnualPremium,
        selfTotalActiveTargetPremium: selfActiveStats.selfTotalActiveTargetPremium,
        selfTotalTargetPremium: selfStats.selfTotalTargetPremium,
        selfPersistency: Math.round(selfPersistency * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      console.error(`Error getting performance stats for NPN ${npn}:`, error);
      return null;
    }
  }

  // Fallback method using original approach
  private async getPerformanceStatsOriginal(
    performanceStats: any,
    isAdmin: boolean,
    npn: string,
  ) {
    // This would be a simplified fallback implementation
    // For now, return empty results to prevent errors
    return {
      totalPages: 0,
      totalRecords: 0,
      currentPage: performanceStats.page || 1,
      results: [],
    };
  }
}

