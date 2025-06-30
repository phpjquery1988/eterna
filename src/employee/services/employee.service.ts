import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon from 'argon2';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { startOfWeek, endOfWeek, format, startOfDay, addDays } from 'date-fns';
import { Employee } from '../entities/employee.schema';
import { EmployeeHierarchy } from '../entities/employee.herarchy.schema';
import { Policy } from '../entities/policy.schema';
import { License } from '../entities/license.schema';
import { StaticData } from '../entities/static.schema';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import {
  createAgentsHierarchy,
  manageEmployeeHierarchy,
  matchStates,
} from '../helper';
import { OnlyDateRangeDto } from '../dto/date-range.dto';
import { PolicyDto } from '../dto/create-policy.dto';
import { performanceStatsDto, policyDetailerDto } from '../dto/stats.dto';
import { getLicenseDto, UpdateLicenseDto } from '../dto/license.dto';
import { UsersService } from 'src/users/services/users.service';
import { CreateUserCommand, UserRoleEnum } from '@app/contracts';
import { AgentHierarchy } from '../entities/csv-uplao/agents.employee.schema';
import { TwilioService } from 'src/auth/services/twilio-auth.service';
import * as XLSX from 'xlsx';
import { DateService } from './date.service';
import { User } from 'src/users/model/user.model';

@Injectable()
export class EmployeeService {
  private requiredColumns: string[] = [
    'id',
    'npn',
    'phone',
    'email',
    'hrnpn',
    'eftdt',
    'enddt',
    'agent',
    'isDeleted',
    'agentType',
    'otherPhones',
    'agentStatus',
    'agentsUpline',
    'residentState',
    'agentsUplineNpn',
  ];

  private requiredColumnsPolicy: string[] = [
    'consolidatedPolicyStatus',
    'policyNo',
  ];

  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<Employee>,
    @InjectModel(EmployeeHierarchy.name)
    private readonly employeeHierarchyModel: Model<EmployeeHierarchy>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<Policy>,
    @InjectModel(License.name)
    private readonly licenseModel: Model<License>,
    @InjectModel(StaticData.name)
    private readonly staticDataModel: Model<StaticData>,
    @InjectModel(AgentHierarchy.name)
    private readonly agentHierarchyModel: Model<AgentHierarchy>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly users: UsersService,
    private readonly dateService: DateService,
  ) {}

  toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  async create(createEmployeeDtos: CreateEmployeeDto[]) {
    if (createEmployeeDtos.length && createEmployeeDtos[0]) {
      const columnNames = Object.keys(createEmployeeDtos[0]);
      console.log('[columnNames]', columnNames);

      // Find missing columns: present in "requiredColumns" but not in "columns"
      const missingColumns = this.requiredColumns.filter(
        (col) => !columnNames.includes(col),
      );
      if (missingColumns.length) {
        throw new BadRequestException(
          `missing columns: ${missingColumns.map(this.toSnakeCase).join(',')}`,
        );
      }
    }

    const notFoundSupervisors = [];

    try {
      for (let createEmployeeDto of createEmployeeDtos) {
        createEmployeeDto = this.sanitizeAgentItem(createEmployeeDto);
        const npn = createEmployeeDto.npn;
        // create user for each employee
        const user = await this.users.findByNpn(npn);
        const phone = createEmployeeDto?.phone
          ? TwilioService.getFormattedPhoneNumber(
              createEmployeeDto?.phone?.toString(),
            )
          : '';

        const otherPhones =
          createEmployeeDto.otherPhones &&
          typeof createEmployeeDto.otherPhones === 'string'
            ? createEmployeeDto.otherPhones
                .split(',')
                .map((p) => TwilioService.getFormattedPhoneNumber(p))
            : [];

        createEmployeeDto.otherPhones = otherPhones;
        if (!user) {
          const userName = npn.toString();
          const password = 'Pass@123';
          const firstName = createEmployeeDto?.agent?.split(' ')[0];
          const lastName = createEmployeeDto?.agent?.split(' ')[1];

          const cmd: CreateUserCommand = {
            userName,
            password,
            lastName,
            firstName,
            phone,
            otherPhones,
            role: UserRoleEnum.Employee,
          };
          try {
            await this.users.create(cmd);
            console.log(`created user ${userName} with pass: ${password}`);
          } catch (error) {}
        } else {
          console.log(`User already exists for NPN ${npn}`);

          console.log('phone', phone);
          const cmd: CreateUserCommand = {
            userName: user.userName,
            lastName: user.lastName,
            firstName: user.firstName,
            phone,
            otherPhones,
            role: UserRoleEnum.Employee,
          };
          await this.users.updateBasicData(user._id.toString(), cmd);
        } // Convert email to lowercase if it exists
        if (createEmployeeDto.email) {
          createEmployeeDto.email = createEmployeeDto.email.toLowerCase();
        }

        // Validate and sanitize HRNPN
        if (
          createEmployeeDto.hrnpn &&
          typeof createEmployeeDto.hrnpn !== 'string'
        ) {
          console.warn(
            `Invalid HRNPN value for NPN ${createEmployeeDto.npn}. Converting to empty string.`,
          );
          createEmployeeDto.hrnpn = '';
        }

        // Check if the employee already exists
        const employeeExists = await this.employeeModel.findOne({
          npn: createEmployeeDto.npn,
        });
        let supervisorExists = null;
        const isSupervisorSame =
          createEmployeeDto.agentsUplineNpn === createEmployeeDto.npn;

        // Supervisor logic
        if (!isSupervisorSame) {
          supervisorExists = await this.employeeModel.findOne({
            npn: createEmployeeDto.agentsUplineNpn,
          });
          if (!supervisorExists) {
            // Check if supervisor exists in the current DTO batch
            const supervisorDto = createEmployeeDtos.find(
              (dto) => dto.npn === createEmployeeDto.agentsUplineNpn,
            );

            if (supervisorDto) {
              await this.create([supervisorDto]); // Create supervisor first
              supervisorExists = await this.employeeModel.findOne({
                npn: supervisorDto.npn,
              });
            } else {
              notFoundSupervisors.push({
                agentsUplineNpn: createEmployeeDto.agentsUplineNpn,
                npn: createEmployeeDto.npn,
              });
              console.warn(
                `Supervisor with NPN ${createEmployeeDto.agentsUplineNpn} not found.`,
              );
            }
          }
        }

        // If employee exists, update it and manage hierarchy
        if (employeeExists) {
          const supervisorId = isSupervisorSame
            ? employeeExists._id.toString()
            : supervisorExists?._id.toString();

          await this.updateEmployee(
            employeeExists._id,
            createEmployeeDto,
            supervisorId,
          );

          await manageEmployeeHierarchy(
            {
              employeeId: employeeExists._id.toString(),
              supervisorId,
            },
            this.employeeModel,
            typeof createEmployeeDto?.hrnpn === 'string'
              ? createEmployeeDto.hrnpn.split('|')
              : undefined,
          );

          continue; // Skip to the next iteration
        }

        // If employee does not exist, create a new one
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await argon.hash(randomPassword);
        createEmployeeDto.password = hashedPassword;

        const createdEmployee = new this.employeeModel(createEmployeeDto);
        await createdEmployee.save();

        const supervisorId = isSupervisorSame
          ? createdEmployee._id.toString()
          : supervisorExists?._id.toString();

        await manageEmployeeHierarchy(
          {
            employeeId: createdEmployee._id.toString(),
            supervisorId,
          },
          this.employeeModel,
          typeof createEmployeeDto?.hrnpn === 'string'
            ? createEmployeeDto.hrnpn.split('|')
            : undefined,
        );

        await this.createEmployeeHierarchy({
          employeeId: createdEmployee._id.toString(),
          supervisorId,
          eftdt: createEmployeeDto.eftdt,
          enddt: createEmployeeDto.enddt,
        });

        console.log(`Employee created successfully: ${createEmployeeDto.npn}`);
      }

      if (notFoundSupervisors.length > 0) {
        console.warn('Some supervisors were not found:', notFoundSupervisors);
      }

      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error creating employees:', error.message);
      throw new BadRequestException('Operation failed');
    }
  }

  sanitizeAgentItem(item: CreateEmployeeDto): CreateEmployeeDto {
    const eftdt = <string>(item.eftdt as any);
    if (eftdt && eftdt.trim()) {
      item.eftdt = this.dateService.getStartDate(eftdt);
    } else {
      item.eftdt = null;
    }

    const enddt = <string>(item.enddt as any);
    if (enddt && enddt.trim()) {
      item.enddt = this.dateService.getStartDate(enddt);
    } else {
      item.enddt = null;
    }

    item.phone = item?.phone
      ? TwilioService.getFormattedPhoneNumber(item?.phone?.toString())
      : '';

    item.otherPhones =
      item.otherPhones && typeof item.otherPhones === 'string'
        ? item.otherPhones
            .split(',')
            .map((p) => TwilioService.getFormattedPhoneNumber(p))
        : [];

    if (item.email) {
      item.email = item.email.toLowerCase();
    }
    return item;
  }

  async createAgents(createEmployeeDtos: CreateEmployeeDto[]) {
    if (createEmployeeDtos.length && createEmployeeDtos[0]) {
      const columnNames = Object.keys(createEmployeeDtos[0]);
      console.log('[columnNames]', columnNames);

      // Find missing columns: present in "requiredColumns" but not in "columns"
      const missingColumns = this.requiredColumns.filter(
        (col) => !columnNames.includes(col),
      );
      if (missingColumns.length) {
        throw new BadRequestException(
          `missing columns: ${missingColumns.map(this.toSnakeCase).join(',')}`,
        );
      }
    }

    try {
      const bulkOpsAgents = createEmployeeDtos.map((item) => {
        // Sanitize each item.
        item = this.sanitizeAgentItem(item);

        // When an ID is provided, determine whether to update or delete.
        if (item.id) {
          if (Number(item.isDeleted) === 1) {
            // Delete operation for items marked as deleted.
            return {
              deleteOne: {
                filter: { _id: item.id },
              },
            };
          } else {
            // Update operation for items that are not deleted.
            return {
              updateOne: {
                filter: {
                  $or: [{ _id: item.id }, { npn: item.npn }],
                },
                update: { $set: { ...item } },
                upsert: false, // Do not insert if not found.
              },
            };
          }
        } else {
          // Insert operation for new items (no id provided).
          return {
            updateOne: {
              filter: { npn: item.npn },
              update: { $set: { ...item } },
              upsert: true,
            },
          };
        }
      });
      const bulkOpsUsers = createEmployeeDtos.map((item, index) => {
        const userName = item.npn.toString();
        const password = 'Pass@123';
        // Split agent name to extract first and last name
        const agentParts = item?.agent?.split(' ') || [];
        const firstName = agentParts[0] || '';
        const lastName = agentParts[1] || '';

        // Prepare the create/update command
        const cmd: CreateUserCommand = {
          userName,
          password,
          firstName,
          lastName,
          phone: item.phone, // Adjust if needed
          otherPhones: item.otherPhones as Array<string>, // Adjust if needed
          role:
            userName === process.env.ADMIN_NPN
              ? UserRoleEnum.Admin
              : UserRoleEnum.Employee,
        };

        // Create an upsert operation: update if found, create if not
        return {
          updateOne: {
            filter: { userName },
            update: { $set: cmd },
            upsert: true,
          },
        };
      });

      await Promise.all([
        this.employeeModel.bulkWrite(bulkOpsAgents),
        this.userModel.bulkWrite(bulkOpsUsers),
      ]);

      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error creating employees:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async createEmployeeHierarchy(employeeHierarchy: {
    employeeId: string;
    supervisorId: string;
    eftdt: Date;
    enddt: Date;
  }) {
    try {
      employeeHierarchy.employeeId = employeeHierarchy.employeeId.toString();
      // check employee hierchy by employeeid and supervisor id
      const employeeHierarchyExists = await this.employeeHierarchyModel.findOne(
        {
          employeeId: employeeHierarchy.employeeId,
          supervisorId: employeeHierarchy.supervisorId,
        },
      );
      if (!employeeHierarchyExists) {
        const createdEmployeeHierarchy = new this.employeeHierarchyModel(
          employeeHierarchy,
        );
        await createdEmployeeHierarchy.save();
      }
      return 'Operation success';
    } catch (error) {
      console.error(error);
      return new BadRequestException('Operation failed');
    }
  }

  async updateSingleEmployee(id: any, updatedData: Partial<Employee>) {
    const employee = await this.employeeModel.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true },
    );

    if (employee) {
      const userData: any = {};
      if (updatedData.avatar) userData.avatar = updatedData.avatar;
      if (updatedData.phone) userData.phone = updatedData.phone;
      if (updatedData.email) userData.email = updatedData.email;
      if (updatedData.agent) {
        const names = updatedData.agent.split(',');
        if (names.length > 1) {
          userData.firstName = updatedData.agent.split(',')[0].trim() + ',';
          userData.lastName = updatedData.agent.split(',')[1].trim();
        }
      }

      await this.users.updateByUsername(employee.npn, userData);
    }
    return employee;
  }

  async updateEmployee(
    id: any,
    createEmployeeDto: CreateEmployeeDto,
    superVisorId?: string,
  ) {
    await this.employeeModel.updateOne({ _id: id }, createEmployeeDto);
    await this.createEmployeeHierarchy({
      employeeId: id,
      supervisorId: superVisorId,
      eftdt: createEmployeeDto.eftdt,
      enddt: createEmployeeDto.enddt,
    });
  }

  async findAll(npn: string) {
    const employee = await this.employeeModel.findOne({ npn: npn });
    const allEmployeesOfSupervisor = await this.employeeHierarchyModel
      .find({ supervisorId: employee._id })
      .populate('supervisorId');
    return allEmployeesOfSupervisor;
  }

  // find all the employees just for internal use
  async findAllEmployees() {
    return await this.employeeModel.find();
  }

  async findOne(npn: string) {
    const result = await this.employeeModel.aggregate([
      {
        $match: { npn: npn },
      },
      {
        $lookup: {
          from: 'employeehierarchies',
          localField: '_id',
          foreignField: 'employeeId',
          as: 'hierarchy',
        },
      },
      {
        $lookup: {
          from: 'employees', // Adjust this to your employees collection name
          localField: 'hierarchy.supervisorId',
          foreignField: '_id',
          as: 'supervisorDetails',
        },
      },
      {
        $project: {
          _id: 1,
          npn: 1,
          agent: '$agent',
          agentStatus: 1,
          agentsUpline: '$agentsUpline',
          agentsUplineNpn: '$agentsUplineNpn',
          supervisor: {
            name: { $arrayElemAt: ['$supervisorDetails.agent', 0] },
            npn: { $arrayElemAt: ['$supervisorDetails.npn', 0] },
            agentsUpline: {
              $arrayElemAt: ['$supervisorDetails.agentsUpline', 0],
            },
            agentsUplineNpn: {
              $arrayElemAt: ['$supervisorDetails.agentsUplineNpn', 0],
            },
          },
        },
      },
    ]);

    return result[0]; // Return the first (and only) document from the aggregation result
  }

  async getHierarchy(npn: string) {
    const employee = await this.employeeModel.findOne({ npn: npn });
    return employee.employeeHierarchy;
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

  async getEmployeeHierarchy(
    npn: string,
    req: OnlyDateRangeDto,
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
      req.startDate,
      req.endDate,
      search,
    );

    const self: any = employee.toJSON();
    self.childCount = downlineNpns.length;
    return { agents: downlineNpns, self };
  }

  fixDatesOfPolicy(item: PolicyDto): PolicyDto {
    if (item.dateSold.trim()) {
      item.dateSold = this.dateService.getStartDate(item.dateSold);
    }
    const terminatedDate = <string>(item.terminatedDate as any);
    if (terminatedDate.trim()) {
      item.terminatedDate = this.dateService.getStartDate(terminatedDate);
    } else {
      item.terminatedDate = null;
    }

    const effectiveDate = <string>(item.effectiveDate as any);
    if (effectiveDate.trim()) {
      item.effectiveDate = this.dateService.getStartDate(effectiveDate);
    } else {
      item.effectiveDate = null;
    }

    const exportdt = <string>(item.exportdt as any);
    if (exportdt.trim()) {
      item.exportdt = this.dateService.getStartDate(exportdt);
    } else {
      item.exportdt = null;
    }

    return item;
  }

  // policy ingestion
  async createPolicy(createPolicyDto: Partial<PolicyDto[]>) {
    const notInsertedPolicies = [];

    if (createPolicyDto.length && createPolicyDto[0]) {
      const columnNames = Object.keys(createPolicyDto[0]);

      // Find missing columns: present in "requiredColumns" but not in "columns"
      const missingColumns = this.requiredColumnsPolicy.filter(
        (col) => !columnNames.includes(col),
      );
      if (missingColumns.length) {
        throw new BadRequestException(
          `missing columns: ${missingColumns.map(this.toSnakeCase).join(',')}`,
        );
      }
    }

    for (let item of createPolicyDto) {
      item = this.fixDatesOfPolicy(item);
      try {
        // Ensure `terminated` is a boolean
        // item.terminated = Boolean(item.terminated);
        item.consolidatedPolicyStatus =
          item?.consolidatedPolicyStatus.toLowerCase();
        item.terminated = !(
          item.consolidatedPolicyStatus.includes('active') ||
          item.consolidatedPolicyStatus.includes('pending')
        );

        if (item.policyNo) {
          item.policyNo = item.policyNo.toUpperCase();
        } else {
          // return instead  put skip
          notInsertedPolicies.push(item);
          continue;
        }
        // check with npm if record already exist snd update that record
        const policyExists = await this.policyModel.findOne({
          policyNo: item.policyNo,
          npn: item.npn,
        });

        if (policyExists) {
          console.log('Policy already exists, updating record');
          // update the policy record if already exist
          await this.policyModel.updateOne(
            { policyNo: item.policyNo, npn: item.npn },
            { $set: { ...item, policyCount: item.policyCount } },
          );

          continue;
        } else {
          // create new policy if  existed not
          try {
            const policy = new this.policyModel({
              ...item,
              policyCount: item.policyCount,
            });
            await policy.save();
          } catch (error) {
            console.log(item, 'error=======>');
          }
        }
      } catch (error) {
        console.log(
          '🚀 ~ EmployeeService ~ createPolicyDto.forEach ~ error:',
          error,
        );
      }
    }
    return await this.calculateTotals(notInsertedPolicies);
  }

  async calculateTotals(data) {
    let totalExpectedCommission = 0;
    let totalAnnualPremium = 0;

    // Loop through the data and sum up the values
    data.forEach((item) => {
      totalExpectedCommission += item.expectedCommission || 0;
      totalAnnualPremium += item.annualPremium || 0;
    });

    return {
      missingTotalExpectedCommission: totalExpectedCommission,
      missingTotalAnnualPremium: totalAnnualPremium,
    };
  }
  async getPolicyStats(
    npn: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    result: {
      monthlyStats: { month: string; totalAmount: number; count: number }[];
      allTotal: {
        totalExpectedCommission: number;
        totalCounts: number;
        totalAnnualPremium: number;
      };
    };
  }> {
    // Step 1: Find the employee using the provided npn
    const employee = await this.employeeModel.findOne({ npn });
    if (!employee) {
      throw new NotFoundException(`Employee with NPN ${npn} not found`);
    }

    // Step 2: Set default date range (last 1 year) if not provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setFullYear(defaultEndDate.getFullYear() - 1);

    const dateFilter: any = {};
    if (startDate && endDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter.dateSold = { $gte: startOfDay, $lte: endOfDay };
    }

    // Step 3: Aggregate monthly stats
    const monthlyStats = await this.policyModel.aggregate([
      {
        $match: {
          npn,
          terminated: false,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%B', date: '$dateSold' } }, // Get full month name
          },
          totalAmount: { $sum: '$expectedCommission' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.month': 1 }, // Sort by month name alphabetically
      },
      {
        $project: {
          month: '$_id.month', // Extract month name
          totalAmount: 1,
          count: 1,
          _id: 0, // Exclude _id
        },
      },
    ]);

    // Step 4: Calculate total stats
    const total = await this.policyModel.aggregate([
      {
        $match: {
          npn,
          terminated: false,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null, // Aggregate all records into one
          totalAmount: { $sum: '$expectedCommission' },
          totalAnnualPremium: { $sum: '$annualPremium' },
          totalCount: { $sum: 1 },
        },
      },
      {
        $project: {
          totalAmount: 1,
          totalCount: 1,
          _id: 0, // Exclude _id
          totalAnnualPremium: 1,
        },
      },
    ]);

    // Step 5: Return both monthly breakdown and total stats
    return {
      result: {
        monthlyStats,
        allTotal:
          total.length > 0
            ? {
                totalExpectedCommission: total[0].totalAmount,
                totalCounts: total[0].totalCount,
                totalAnnualPremium: total[0].totalAnnualPremium,
              }
            : {
                totalExpectedCommission: 0,
                totalCounts: 0,
                totalAnnualPremium: 0,
              },
      },
    };
  }

  async getPolicyStatsBySupervisor(
    npn: string,
    req: OnlyDateRangeDto,
    isAdmin: boolean,
  ): Promise<{
    result: {
      monthlyStats: { month: string; totalAmount: number; count: number }[];
      lastDataUpdated: string;
      allTotal: {
        totalCommissionPremium: number;
        totalCounts: number;
        totalAnnualPremium: number;
      };
    };
  }> {
    let employee = null;
    let employeeData = [];
    if (isAdmin && npn === process.env.ADMIN_NPN) {
      employeeData = await this.employeeModel.find({
        agentsUplineNpn: { $in: [process.env.ADMIN_NPN] },
      });
      // find  agent for  each employee hierarchy for each and add to npn
      for (const item of employeeData) {
        const hierarchyData = await this.agentHierarchyModel.findOne({
          batchId: item.batchId,
        });

        if (hierarchyData) {
          item.hierarchy = hierarchyData.hierarchy.filter(
            (hierarchyItem) => hierarchyItem !== process.env.ADMIN_NPN,
          );
          employeeData.push(...item.hierarchy);
        }
      }
    } else {
      employee = await this.employeeModel.findOne({ npn });

      if (employee) {
        const hierarchyData = await this.agentHierarchyModel.findOne({
          batchId: employee.batchId,
        });

        if (hierarchyData) {
          employeeData = hierarchyData.hierarchy.filter(
            (item) => item !== process.env.ADMIN_NPN,
          );
        }
      }
    }
    const uniqueEmployeeData = [...new Set(employeeData)].filter(Boolean); // Step 3: Prepare date filter
    let queryStartDate;
    let queryEndDate;
    let querySixMonthStartDate;
    if (req.startDate && req.endDate) {
      queryStartDate = this.dateService.getStartDate(req.startDate.toString());
      queryEndDate = this.dateService.getEndDate(req.endDate.toString());
      const prevSixMonthOfDay = this.dateService.getStartDate(
        req.endDate.toString(),
      );
      prevSixMonthOfDay.setMonth(prevSixMonthOfDay.getMonth() - 6);
      querySixMonthStartDate =
        queryStartDate > prevSixMonthOfDay ? prevSixMonthOfDay : queryEndDate;
    }

    const monthlyStats = await this.employeeModel.aggregate([
      {
        $match: {
          npn: npn,
        },
      },
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
          agent: 1,
          npn: 1,
          allNpns: {
            $concatArrays: [
              ['$npn'],
              {
                $map: {
                  input: '$descendants',
                  as: 'd',
                  in: '$$d.npn',
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'policies',
          let: {
            agentNpns: '$allNpns',
            startDate: querySixMonthStartDate,
            endDate: queryEndDate,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$npn', '$$agentNpns'] },
                    { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                    { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                  ],
                },
              },
            },
            {
              $project: {
                year: { $year: '$dateSold' },
                month: { $month: '$dateSold' },
                annualPremium: 1,
                commissionPremium: 1,
              },
            },
          ],
          as: 'activePolicies',
        },
      },
      {
        $unwind: '$activePolicies',
      },
      {
        $group: {
          _id: {
            year: '$activePolicies.year',
            month: '$activePolicies.month',
          },
          totalAmount: { $sum: '$activePolicies.annualPremium' },
          totalCommissionAmount: { $sum: '$activePolicies.commissionPremium' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          totalCommissionAmount: 1,
          count: 1,
          year: '$_id.year',
          month: {
            $let: {
              vars: {
                months: [
                  '',
                  'January',
                  'February',
                  'March',
                  'April',
                  'May',
                  'June',
                  'July',
                  'August',
                  'September',
                  'October',
                  'November',
                  'December',
                ],
              },
              in: { $arrayElemAt: ['$$months', '$_id.month'] },
            },
          },
        },
      },
      {
        $sort: { year: 1, month: 1 },
      },
    ]);

    // Step 5: Get overall totals
    const allTotal = await this.employeeModel.aggregate([
      {
        $match: {
          npn,
        },
      },
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
          agent: 1,
          npn: 1,
          allNpns: {
            $concatArrays: [
              ['$npn'],
              {
                $map: {
                  input: '$descendants',
                  as: 'd',
                  in: '$$d.npn',
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'policies',
          let: {
            agentNpns: '$allNpns',
            startDate: queryStartDate,
            endDate: queryEndDate,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$npn', '$$agentNpns'] },
                    { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                    { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                  ],
                },
              },
            },
          ],
          as: 'activePolicies',
        },
      },
      {
        $unwind: '$activePolicies',
      },
      {
        $group: {
          _id: null,
          totalAnnualPremium: { $sum: '$activePolicies.annualPremium' },
          totalCommissionPremium: { $sum: '$activePolicies.commissionPremium' },
          count: { $sum: '$activePolicies.policyCount' },
        },
      },
    ]);
    console.log('[allTotal]', allTotal);
    const overallTotals: any = allTotal[0] || {
      totalCommissionPremium: 0,
      totalAnnualPremium: 0,
      count: 0,
    };

    const policy = await this.policyModel.findOne();
    const lastDataUpdated = policy.exportdt
      ? this.dateService.getDateString(policy.exportdt).toString()
      : this.dateService
          .getDateString(this.dateService.getStartDate('03/14/25'))
          .toString();

    // Step 6: Return final data
    return {
      result: {
        monthlyStats,
        lastDataUpdated,
        allTotal: {
          totalCommissionPremium: overallTotals.totalCommissionPremium,
          totalAnnualPremium: overallTotals.totalAnnualPremium,
          totalCounts: overallTotals.count | 0,
        },
      },
    };
  }

  // get total of supervisor
  async getSupervisorTotal(npn: string): Promise<{
    total: number;
    activePolicies: number;
    terminatedPolicies: number;
    totalPremium: number;
    persistency: number;
  }> {
    const supervisor = await this.employeeModel.findOne({ npn });
    if (!supervisor) {
      throw new NotFoundException(`Employee not found`);
    }
    // from this get all employees of supervisor then get total of there policies.
    const employees = await this.employeeHierarchyModel.find({
      supervisorId: supervisor._id,
    });
    const npns = [
      supervisor.npn,
      ...employees.map((employee) => employee.employeeId['npn']),
    ];

    const policies = await this.policyModel.find({
      npn: { $in: npns },
    });
    const total = policies.length;
    const activePolicies = policies.filter(
      (policy) => !policy.terminated,
    ).length;
    const terminatedPolicies = policies.filter(
      (policy) => policy.terminated,
    ).length;
    const totalPremium = policies.reduce(
      (acc, policy) => acc + policy.expectedCommission,
      0,
    );
    const persistency = (activePolicies / total) * 100;
    return {
      total,
      activePolicies,
      terminatedPolicies,
      totalPremium,
      persistency,
    };
  }

  async productWiseCommissionPremium(query: any) {
    let npn = query.npn;
    let includeTeamData = query.includeTeamData;
    let queryStartDate = query.startDate
      ? this.dateService.getStartDate(query.startDate)
      : null;
    let queryEndDate = query.endDate
      ? this.dateService.getEndDate(query.endDate)
      : null;
    let aggregationQuery: any = [
      {
        $match: {
          npn: '' + npn,
          dateSold: {
            $gte: queryStartDate,
            $lte: queryEndDate,
          },
        },
      },
      {
        $group: {
          _id: '$type',
          totalCommissionPremium: {
            $sum: '$commissionPremium',
          },
        },
      },
      {
        $group: {
          _id: null,
          result: {
            $push: {
              k: '$_id',
              v: { $round: ['$totalCommissionPremium', 0] },
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: '$result' },
        },
      },
    ];
    let model: Model<any> = this.policyModel;
    if (includeTeamData === 'true') {
      aggregationQuery = [
        {
          $match: {
            npn: npn,
          },
        },
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
            agent: 1,
            npn: 1,
            allNpns: {
              $concatArrays: [
                ['$npn'],
                {
                  $map: {
                    input: '$descendants',
                    as: 'd',
                    in: '$$d.npn',
                  },
                },
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'policies',
            let: {
              agentNpns: '$allNpns',
              startDate: queryStartDate,
              endDate: queryEndDate,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$npn', '$$agentNpns'] },
                      { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                      { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                    ],
                  },
                },
              },
            ],
            as: 'allPolicies',
          },
        },
        {
          $unwind: '$allPolicies',
        },
        {
          $group: {
            _id: '$allPolicies.type',
            totalCommissionPremium: { $sum: '$allPolicies.commissionPremium' },
          },
        },
        {
          $group: {
            _id: null,
            result: {
              $push: {
                k: '$_id',
                v: { $round: ['$totalCommissionPremium', 0] },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: { $arrayToObject: '$result' },
          },
        },
      ];
      model = this.employeeModel;
    }

    const result = await model.aggregate(aggregationQuery);
    console.log('[result]', result);
    return result[0] || {};
  }

  async productWiseTotalPremium(query: any) {
    let npn = query.npn;
    let includeTeamData = query.includeTeamData;
    let queryStartDate = query.startDate
      ? this.dateService.getStartDate(query.startDate)
      : null;
    let queryEndDate = query.endDate
      ? this.dateService.getEndDate(query.endDate)
      : null;

    console.log('[npn]', npn, queryStartDate, queryEndDate);
    let aggregationQuery: any = [
      {
        $match: {
          npn: '' + npn,
          dateSold: {
            $gte: queryStartDate,
            $lte: queryEndDate,
          },
        },
      },
      {
        $group: {
          _id: '$type',
          totalAnnualPremium: {
            $sum: '$annualPremium',
          },
        },
      },
      {
        $group: {
          _id: null,
          result: {
            $push: {
              k: '$_id',
              v: { $round: ['$totalAnnualPremium', 0] },
            },
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $arrayToObject: '$result' },
        },
      },
    ];
    let model: Model<any> = this.policyModel;
    console.log('includeTeamData', includeTeamData);
    if (includeTeamData === 'true') {
      aggregationQuery = [
        {
          $match: {
            npn: npn,
          },
        },
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
            agent: 1,
            npn: 1,
            allNpns: {
              $concatArrays: [
                ['$npn'],
                {
                  $map: {
                    input: '$descendants',
                    as: 'd',
                    in: '$$d.npn',
                  },
                },
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'policies',
            let: {
              agentNpns: '$allNpns',
              startDate: queryStartDate,
              endDate: queryEndDate,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$npn', '$$agentNpns'] },
                      { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                      { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                    ],
                  },
                },
              },
            ],
            as: 'allPolicies',
          },
        },
        {
          $unwind: '$allPolicies',
        },
        {
          $group: {
            _id: '$allPolicies.type',
            totalAnnualPremium: { $sum: '$allPolicies.annualPremium' },
          },
        },
        {
          $group: {
            _id: null,
            result: {
              $push: {
                k: '$_id',
                v: { $round: ['$totalAnnualPremium', 0] },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: { $arrayToObject: '$result' },
          },
        },
      ];
      model = this.employeeModel;
    }

    const result = await model.aggregate(aggregationQuery);
    console.log('[result]', result);
    return result[0] || {};
  }

  async performanceStats(
    performanceStats: performanceStatsDto,
    isAdmin: boolean,
    npn: string,
  ) {
    const page = performanceStats.page > 0 ? performanceStats.page : 1;
    const type = performanceStats.productType || null;
    console.log('type', type);
    npn =
      isAdmin && npn === process.env.ADMIN_NPN ? process.env.ADMIN_NPN : npn;

    let queryStartDate;
    let queryEndDate;
    if (performanceStats.startDate || performanceStats.endDate) {
      const startOfDay = new Date(performanceStats.startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(performanceStats.endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      queryStartDate = startOfDay;
      queryEndDate = endOfDay;
    }

    const downlineNpn = await this.getImmediateDownlines(npn);

    const npns =
      npn === process.env.ADMIN_NPN ? downlineNpn : [npn, ...downlineNpn];

    const res = await Promise.all(
      npns.map(async (npn) => {
        const empRes = await this.employeeModel.aggregate([
          {
            $match: {
              npn: npn,
            },
          },
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
              agent: 1,
              npn: 1,
              allNpns: {
                $concatArrays: [
                  ['$npn'],
                  {
                    $map: {
                      input: '$descendants',
                      as: 'd',
                      in: '$$d.npn',
                    },
                  },
                ],
              },
            },
          },
          {
            $lookup: {
              from: 'policies',
              let: {
                agentNpns: '$allNpns',
                startDate: queryStartDate,
                endDate: queryEndDate,
                type: type,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $in: ['$npn', '$$agentNpns'] },
                        { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                        { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                        {
                          $or: [
                            { $eq: ['$type', '$$type'] },
                            { $eq: ['$$type', null] },
                          ],
                        },
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
              from: 'policies',
              let: {
                agentNpns: '$allNpns',
                startDate: queryStartDate,
                endDate: queryEndDate,
                type: type,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $in: ['$npn', '$$agentNpns'],
                        },
                        {
                          $eq: ['$consolidatedPolicyStatus', 'active'],
                        },
                        { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                        { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                        {
                          $or: [
                            { $eq: ['$type', '$$type'] },
                            { $eq: ['$$type', null] },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'activePolicies',
            },
          },
          {
            $lookup: {
              from: 'policies',
              let: {
                npn: '$npn',
                startDate: queryStartDate,
                endDate: queryEndDate,
                type: type,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$npn', '$$npn'] },
                        { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                        { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                        {
                          $or: [
                            { $eq: ['$type', '$$type'] },
                            { $eq: ['$$type', null] },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'selfPolicies',
            },
          },
          {
            $lookup: {
              from: 'policies',
              let: {
                npn: '$npn',
                startDate: queryStartDate,
                endDate: queryEndDate,
                type: type,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$npn', '$$npn'] },
                        { $eq: ['$consolidatedPolicyStatus', 'active'] },
                        { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                        { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                        {
                          $or: [
                            { $eq: ['$type', '$$type'] },
                            { $eq: ['$$type', null] },
                          ],
                        },
                      ],
                    },
                  },
                },
              ],
              as: 'selfActivePolicies',
            },
          },
          {
            $project: {
              name: '$agent',
              npn: 1,
              total: {
                $sum: '$allPolicies.policyCount',
              },
              activePolicies: {
                $sum: '$activePolicies.policyCount',
              },
              totalAnnualPremium: {
                $sum: '$allPolicies.annualPremium',
              },
              totalActiveAnnualPremium: {
                $sum: '$activePolicies.annualPremium',
              },
              totalActiveTargetPremium: {
                $sum: '$activePolicies.commissionPremium',
              },
              totalTargetPremium: {
                $sum: '$allPolicies.commissionPremium',
              },
              persistency: {
                $cond: [
                  { $gt: [{ $sum: '$allPolicies.policyCount' }, 0] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $sum: '$activePolicies.policyCount' },
                          { $sum: '$allPolicies.policyCount' },
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },

              selfTotal: { $sum: '$selfPolicies.policyCount' },
              selfActivePolicies: { $sum: '$selfActivePolicies.policyCount' },
              selfTotalAnnualPremium: { $sum: '$selfPolicies.annualPremium' },
              selfTotalActiveAnnualPremium: {
                $sum: '$selfActivePolicies.annualPremium',
              },
              selfTotalActiveTargetPremium: {
                $sum: '$selfActivePolicies.commissionPremium',
              },
              selfTotalTargetPremium: {
                $sum: '$selfPolicies.commissionPremium',
              },

              selfPersistency: {
                $cond: [
                  { $gt: [{ $sum: '$selfPolicies.policyCount' }, 0] },
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $sum: '$selfActivePolicies.policyCount' },
                          { $sum: '$selfPolicies.policyCount' },
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        ]);

        return empRes[0];
      }),
    );

    return {
      totalPages: 0,
      totalRecords: 0,
      currentPage: page,
      results: res,
    };
  }

  async exportPolicies(
    npn: string,
    req: policyDetailerDto,
    isAdmin: boolean,
    cancelledStatusFilter: string,
    res,
  ) {
    let queryStartDate = req.startDate
      ? this.dateService.getStartDate(req.startDate.toString())
      : null;
    let queryEndDate = req.endDate
      ? this.dateService.getEndDate(req.endDate.toString())
      : null;

    let type = req.type || null;
    const policies = await this.employeeModel.aggregate([
      {
        $match: {
          npn,
        },
      },
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
          agent: 1,
          npn: 1,
          allNpns: {
            $concatArrays: [
              ['$npn'],
              {
                $map: {
                  input: '$descendants',
                  as: 'd',
                  in: '$$d.npn',
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'policies',
          let: {
            agentNpns: '$allNpns',
            startDate: queryStartDate,
            endDate: queryEndDate,
            consolidatedPolicyStatus: cancelledStatusFilter,
            type: type,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$npn', '$$agentNpns'] },
                    {
                      $or: [
                        { $eq: ['$$consolidatedPolicyStatus', 'all'] },
                        {
                          $eq: [
                            '$consolidatedPolicyStatus',
                            '$$consolidatedPolicyStatus',
                          ],
                        },
                      ],
                    },
                    { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                    { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
                    {
                      $or: [
                        { $eq: ['$type', '$$type'] },
                        { $eq: ['$$type', null] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'activePolicies',
        },
      },
      {
        $unwind: '$activePolicies',
      },
      { $replaceRoot: { newRoot: '$activePolicies' } },
      {
        $facet: {
          policies: [],
          totalCount: [
            // Instead of counting documents, sum the policyCount field from each activePolicy
            { $group: { _id: null, total: { $sum: '$policyCount' } } },
          ],
        },
      },
      {
        $project: {
          policies: 1,
          total: { $arrayElemAt: ['$totalCount.total', 0] },
        },
      },
    ]);
    const selectedColumns = [
      'policyNo',
      'agent',
      'contactName',
      'product',
      'type',
      'carrier',
      'annualPremium',
      'commissionPremium',
      'consolidatedPolicyStatus',
      'policyCount',
      'dateSold',
    ];
    const columnMappings = {
      contactName: 'Customer Name',
      dateSold: 'Policy Date',
      type: 'Type',
      effectiveDate: 'Effective Date',
      terminated: 'Terminated',
      product: 'Product',
      annualPremium: 'Annual Premium',
      commissionPremium: 'Commission Premium',
      carrierPolicyStatus: 'Carrier Policy Status',
      consolidatedPolicyStatus: 'Status',
      carrier: 'Carrier',
      policyNo: 'Policy #',
      npn: 'NPN',
      agent: 'Agent',
      agentType: 'Agent Type',
      agentsUpline: 'Agents Upline',
      agentsUplineNpn: 'Agents Upline NPN',
      expectedCommission: 'Expected Commission',
      policyStatus: 'Policy Status',
      commissionStatus: 'Commission Status',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      policyCount: 'Policy Count',
      terminatedDate: 'Terminated Date',
    };
    const formattedData =
      policies?.[0]?.policies?.map((policy) => {
        return selectedColumns.reduce((acc, key) => {
          const newKey = columnMappings[key] || key; // Use mapped name or default key
          acc[newKey] = policy[key];
          return acc;
        }, {});
      }) || [];

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Send the Excel file
    res.send(buffer);
  }

  async getImmediateDownlines(npn: string): Promise<string[]> {
    const downlineNpn = await this.employeeModel.aggregate([
      {
        $match: {
          agentsUplineNpn: npn,
        },
      },
      {
        $project: {
          npn: 1,
        },
      },
    ]);

    return downlineNpn.map((d) => d.npn);
  }

  async getAllDownlines(npn: string): Promise<string[]> {
    const downlineNpn = await this.employeeModel.aggregate([
      {
        $match: {
          npn: npn,
        },
      },
      {
        $graphLookup: {
          from: 'employees',
          startWith: '$npn',
          connectFromField: 'npn',
          connectToField: 'agentsUplineNpn',
          as: 'descendants',
          depthField: 'depth',
        },
      },
      {
        $unwind: {
          path: '$descendants',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          'descendants.depth': 1,
          'descendants.agent': 1,
        },
      },
      {
        $group: {
          _id: '$npn',
          parentNpn: { $first: '$npn' },
          sortedDescendants: {
            $push: '$descendants.npn',
          },
        },
      },
      {
        $project: {
          _id: 0,
          npn: {
            $concatArrays: [['$parentNpn'], '$sortedDescendants'],
          },
        },
      },
      { $unwind: '$npn' },
    ]);

    return downlineNpn.map((d) => d.npn);
  }

  async getPolicyDetails(
    npn: string,
    req: policyDetailerDto,
    isAdmin: boolean,
    cancelledStatusFilter: string,
    type: string,
    search: string,
  ) {
    let queryStartDate = req.startDate
      ? this.dateService.getStartDate(req.startDate.toString())
      : null;
    let queryEndDate = req.endDate
      ? this.dateService.getEndDate(req.endDate.toString())
      : null;

    type = type || null;
    search = search || '';
    let page = req.page > 0 ? req.page : 1;
    const limit = Number(req.limit) > 0 ? req.limit : 10;
    page = Number(page);
    const result = await this.employeeModel.aggregate([
      {
        $match: {
          npn,
        },
      },
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
          agent: 1,
          npn: 1,
          allNpns: {
            $concatArrays: [
              ['$npn'],
              {
                $map: {
                  input: '$descendants',
                  as: 'd',
                  in: '$$d.npn',
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'policies',
          let: {
            agentNpns: '$allNpns',
            startDate: queryStartDate,
            endDate: queryEndDate,
            consolidatedPolicyStatus: cancelledStatusFilter,
            type: type,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$npn', '$$agentNpns'] },
                    {
                      $or: [
                        { $eq: ['$$consolidatedPolicyStatus', 'all'] },
                        {
                          $eq: [
                            '$consolidatedPolicyStatus',
                            '$$consolidatedPolicyStatus',
                          ],
                        },
                      ],
                    },
                    {
                      $gte: [
                        {
                          $cond: {
                            if: {
                              $eq: ['$$consolidatedPolicyStatus', 'cancelled'],
                            },
                            then: '$terminatedDate',
                            else: '$dateSold',
                          },
                        },
                        { $toDate: '$$startDate' },
                      ],
                    },
                    {
                      $lte: [
                        {
                          $cond: {
                            if: {
                              $eq: ['$$consolidatedPolicyStatus', 'cancelled'],
                            },
                            then: '$terminatedDate',
                            else: '$dateSold',
                          },
                        },
                        { $toDate: '$$endDate' },
                      ],
                    },
                    {
                      $or: [
                        { $eq: ['$type', '$$type'] },
                        { $eq: ['$$type', null] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'activePolicies',
        },
      },
      {
        $unwind: '$activePolicies',
      },
      { $replaceRoot: { newRoot: '$activePolicies' } },
      {
        $match: {
          $or: [
            { agent: { $regex: search, $options: 'i' } },
            { contactName: { $regex: search, $options: 'i' } },
          ],
        },
      },
      {
        $facet: {
          policies: [
            { $skip: (Number(page) - 1) * Number(limit) },
            { $limit: Number(limit) },
          ],
          totalCount: [
            // Instead of counting documents, sum the policyCount field from each activePolicy
            { $group: { _id: null, total: { $sum: '$policyCount' } } },
          ],
        },
      },
      {
        $project: {
          policies: 1,
          total: { $arrayElemAt: ['$totalCount.total', 0] },
          page: { $literal: page },
          limit: { $literal: limit.toString() },
        },
      },
    ]);
    return result[0];
  }

  async calculatePersistency(
    npn: string,
    includeDownline: boolean,
    isAdmin: boolean,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    sixMonthPersistencyHistory: { month: string; persistency: number }[];
    oneYearQuarterlyPersistencyHistory: {
      quarter: string;
      persistency: number;
    }[];
    overallPersistency: number;
  }> {
    const endDateObj = endDate
      ? this.dateService.getEndDate(endDate.toString())
      : this.dateService.getStartDate(
          this.dateService.getDateString(new Date()),
        );

    const employeeModel = this.employeeModel;

    function calculatePersistencyForRange(policies) {
      if (!policies || policies.total === 0) return 0;
      return (policies.active / policies.total) * 100;
    }

    async function getPoliciesForRange(
      npn: string,
      startDate: Date,
      endDate: Date,
    ) {
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
            from: 'policies',
            let: { agentNpns: '$allNpns', startDate, endDate },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$npn', '$$agentNpns'] },
                      { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                      { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
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
            from: 'policies',
            let: { agentNpns: '$allNpns', startDate, endDate },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$npn', '$$agentNpns'] },
                      { $eq: ['$consolidatedPolicyStatus', 'active'] },
                      { $gte: ['$dateSold', { $toDate: '$$startDate' }] },
                      { $lte: ['$dateSold', { $toDate: '$$endDate' }] },
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
            totalPolicies: { $sum: '$allPolicies.policyCount' },
            activePolicies: { $sum: '$activePolicies.policyCount' },
          },
        },
      ]);

      return result.length > 0
        ? { total: result[0].totalPolicies, active: result[0].activePolicies }
        : { total: 0, active: 0 };
    }

    const sixMonthPersistencyHistory = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(endDateObj);
      start.setMonth(endDateObj.getMonth() - i);
      start.setDate(1);

      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);

      const policies = await getPoliciesForRange(npn, start, end);
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

      const policies = await getPoliciesForRange(npn, start, end);
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
    );
    const overallPersistency = calculatePersistencyForRange(overallPolicies);

    return {
      sixMonthPersistencyHistory,
      oneYearQuarterlyPersistencyHistory,
      overallPersistency,
    };
  }

  async calculateChargebacks(startDate?: Date, endDate?: Date, npn?: string) {
    // Build the query object
    const query: any = { npn };

    if (startDate && endDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.dateSold = { $gte: startOfDay, $lte: endOfDay };
    }

    // Fetch policies based on the query
    const policies = await this.policyModel.find(query);

    const totalPolicies = policies.length; // Total policies in the range
    const canceledPolicies = policies.filter(
      (policy) => policy.terminated,
    ).length;
    const chargebackPercentage =
      totalPolicies > 0 ? (canceledPolicies / totalPolicies) * 100 : 0;

    return {
      totalPolicies,
      canceledPolicies,
      chargebackPercentage,
    };
  }

  async calculateChargebacksAgent(
    npn: string,
    data: OnlyDateRangeDto,
    isAdmin: boolean,
  ) {
    // If startDate or endDate are not provided, set default values
    const now = new Date();
    const defaultStartDate = new Date(now.setFullYear(now.getFullYear() - 1)); // Default start date: 1 year ago
    const defaultEndDate = new Date(); // Default end date: now
    const queryStartDate = this.dateService.getStartDate(
      data.startDate.toString(),
    );
    const queryEndDate = this.dateService.getEndDate(data.endDate.toString());

    let policies = null;

    let queryAggregation = [
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
          agent: 1,
          npn: 1,
          allNpns: {
            $concatArrays: [
              ['$npn'],
              {
                $map: {
                  input: '$descendants',
                  as: 'd',
                  in: '$$d.npn',
                },
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'policies',
          let: {
            agentNpns: '$allNpns',
            startDate: queryStartDate,
            endDate: queryEndDate,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$npn', '$$agentNpns'] },
                    { $gte: ['$terminatedDate', { $toDate: '$$startDate' }] },
                    { $lte: ['$terminatedDate', { $toDate: '$$endDate' }] },
                  ],
                },
              },
            },
          ],
          as: 'allPolicies',
        },
      },
      { $unwind: '$allPolicies' },
      {
        $group: {
          _id: null,
          totalPolicies: { $sum: 1 },
          canceledPolicies: {
            $sum: {
              $cond: [
                { $eq: ['$allPolicies.consolidatedPolicyStatus', 'cancelled'] },
                '$allPolicies.policyCount',
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalPolicies: 1,
          canceledPolicies: 1,
          chargebackPercentage: {
            $cond: [
              { $gt: ['$totalPolicies', 0] },
              {
                $multiply: [
                  { $divide: ['$canceledPolicies', '$totalPolicies'] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    ];

    let chargeBackResult: any;
    if (isAdmin && npn === process.env.ADMIN_NPN) {
      chargeBackResult = await this.employeeModel.aggregate([
        {
          $match: {
            npn: process.env.ADMIN_NPN,
          },
        },
        ...queryAggregation,
      ]);

      const policiesSelf: any = await this.policyModel.find({
        dateSold: { $gte: queryStartDate, $lte: queryEndDate },
        npn: process.env.ADMIN_NPN,
      });
      const personal = policiesSelf.length;

      return {
        ...chargeBackResult[0],
        personal,
      };
    } else {
      chargeBackResult = await this.employeeModel.aggregate([
        {
          $match: {
            npn,
          },
        },
        ...queryAggregation,
      ]);
    }

    const policiesSelf = await this.policyModel.find({
      dateSold: { $gte: queryStartDate, $lte: queryEndDate },
      npn: npn,
    });
    const personal = policiesSelf.length;

    return {
      ...chargeBackResult[0],
      personal,
    };
  }

  async commissionPaid(npm: string) {
    const policies = await this.policyModel.find({
      npn: npm,
      terminated: false,
      commissionStatus: 'Paid in Full',
    });
    const commissionPaid = policies.reduce(
      (acc, policy) => acc + policy.expectedCommission,
      0,
    );
    return commissionPaid;
  }

  async countLicensesByStatus(
    npn: string,
    filters: getLicenseDto,
    isAdmin: boolean,
  ): Promise<Record<string, number>> {
    const query: Record<string, any> = {};
    const employee = await this.employeeModel.findOne({ npn: npn });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!isAdmin) {
      query.user = employee._id;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.licenseType) {
      query.licenseType = filters.licenseType;
    }

    if (filters.state) {
      query['state.name'] = { $in: filters.state.split(',') };
    }

    if (filters.carrier) {
      query.carrier = { $in: filters.carrier.split(',') };
    }

    // Use aggregation to count the number of licenses by status
    const statusCount = await this.licenseModel.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Convert the aggregation result to a simple object with status as key and count as value
    const statusMap = statusCount.reduce((acc, { _id, count }) => {
      acc[_id] = count;
      return acc;
    }, {});

    // Return the status counts
    return statusMap;
  }

  // Get a license by ID
  async findOneLicense(id: string): Promise<License> {
    return this.licenseModel.findById(id).exec();
  }

  // Update a license by ID
  async updateLicense(
    id: string,
    updateLicenseDto: UpdateLicenseDto,
  ): Promise<License> {
    const staticData: StaticData = await this.getStaticData();
    if (updateLicenseDto.state) {
      const states = staticData.state;
      const result = matchStates(updateLicenseDto.state, states);
      updateLicenseDto.state = result;
    }
    return this.licenseModel
      .findByIdAndUpdate(id, updateLicenseDto, {
        new: true,
      })
      .exec();
  }

  // Delete a license by ID
  async removeLicense(id: string): Promise<License> {
    return this.licenseModel.findByIdAndDelete(id).exec();
  }

  async getCommissionEarnings(npn: string) {
    const policies = await this.policyModel.find({
      npn: npn,
      terminated: false,
      commissionStatus: 'Paid in Full',
    });
    const commissionPaid = policies.reduce(
      (acc, policy) => acc + policy.expectedCommission,
      0,
    );
    return commissionPaid;
  }

  async getTeamEarnings(npn: string) {
    // Find the supervisor by NPN
    const supervisor = await this.employeeModel.findOne({ npn });
    if (!supervisor) {
      throw new Error('Supervisor not found');
    }

    // Find all employees under this supervisor
    const employees = await this.employeeHierarchyModel.find({
      supervisorId: supervisor._id,
    });
    // Extract employee NPNs
    const employeeNpns = employees.map(
      (employee) => employee.employeeId['npn'],
    );
    // Fetch policies for all employees
    const policies = await this.policyModel.find({
      npn: { $in: employeeNpns },
      terminated: false,
      // commissionStatus: "Paid in Full"
    });
    // Group policies by employee NPN
    const policiesByEmployee = employees.map((employee) => {
      const employeePolicies = policies.filter(
        (policy) => policy.npn === employee.employeeId['npn'],
      );
      return {
        employeeNpn: employee.employeeId['npn'],
        policies: employeePolicies,
        totalCommission: employeePolicies.reduce(
          (acc, policy) => acc + policy.expectedCommission,
          0,
        ),
      };
    });

    return policiesByEmployee;
  }

  async calculateDownlinePersistency(
    npn: string,
    startDate?: Date,
    endDate?: Date,
    includeDownline?: boolean,
  ) {
    // Construct query to handle optional dates
    const query: any = {
      $or: [{ npn }, ...(includeDownline ? [{ agentsUplineNpn: npn }] : [])],
    };

    // If dates are provided, add them to the query
    if (startDate && endDate) {
      query.dateSold = { $gte: startDate, $lte: endDate };
    }

    // Fetch policies for the given NPN and optionally include downline
    const policies = await this.policyModel.find(query);

    const totalPolicies = policies.length; // Total policies created
    const activePolicies = policies.filter(
      (policy) => !policy.terminated,
    ).length; // Policies that are still alive

    // Calculate persistency percentage
    const persistencyPercentage =
      totalPolicies > 0 ? (activePolicies / totalPolicies) * 100 : 0;

    return {
      totalPolicies,
      activePolicies,
      persistencyPercentage,
    };
  }

  async getEmployeeHierarchyBreadcrumb(npn: string) {
    // Find the employee by npn
    const employee = await this.employeeModel.findOne({ npn });
    if (!employee) {
      throw new Error('Employee not found');
    }
    const employeeHierarchy = employee.employeeHierarchy;
    const hierarchyNames = await Promise.all(
      employeeHierarchy.map(async (empNpn) => {
        const emp = await this.employeeModel.findOne({ npn: empNpn });
        return emp ? emp.agent : null;
      }),
    );

    return hierarchyNames.filter((name) => name !== null);
  }

  async calculateDownlinePersistencyAgent(
    npn: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Construct query to handle optional dates
    const query: any = {
      $or: [{ npn }],
    };

    // If dates are provided, add them to the query
    if (startDate && endDate) {
      query.dateSold = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    // Fetch policies for the given NPN and optionally include downline
    const policies = await this.policyModel.find(query);

    const totalPolicies = policies.length; // Total policies created
    const activePolicies = policies.filter(
      (policy) => !policy.terminated,
    ).length; // Policies that are still alive

    // Calculate persistency percentage
    const persistencyPercentage =
      totalPolicies > 0 ? (activePolicies / totalPolicies) * 100 : 0;

    return {
      totalPolicies,
      activePolicies,
      persistencyPercentage,
    };
  }

  async search(npn: string, isAdmin: boolean, search: string) {
    let employee = [];
    if (isAdmin) {
      employee = await this.employeeModel
        .find({ agent: { $regex: search, $options: 'i' } })
        .select('agent npn');
    } else {
      const supervisor = await this.employeeModel.findOne({ npn });
      if (!supervisor) {
        throw new NotFoundException('Employee not found');
      }
      const employees = await this.employeeHierarchyModel
        .find({ supervisorId: supervisor._id })
        .populate('employeeId');
      const ids = employees.map((item) => item.employeeId);
      employee = await this.employeeModel
        .find({ agent: { $regex: search, $options: 'i' }, _id: { $in: ids } })
        .select('agent npn');
    }
    return employee;
  }

  async policyStatsAgent(npn: string, startDate?: Date, endDate?: Date) {
    const employee = await this.employeeModel.findOne({ npn });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Determine date range: Use custom dates if provided, otherwise use the current week
    const start = startDate
      ? startOfDay(new Date(startDate).setUTCHours(0, 0, 0, 0))
      : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endDate
      ? startOfDay(new Date(endDate).setHours(23, 59, 59, 999))
      : endOfWeek(new Date(), { weekStartsOn: 1 });

    // Fetch Policies within the Date Range
    const policies = await this.policyModel.find({
      npn: employee.npn,
      dateSold: {
        $gte: start,
        $lte: end,
      },
    });

    // Initialize stats for each day in the date range
    const dayStats = {};
    let currentDate = start;

    while (currentDate <= end) {
      const day = format(currentDate, 'yyyy-MM-dd');
      dayStats[day] = { issued: 0, chargeBackOwed: 0, totalPolicies: 0 };
      currentDate = addDays(currentDate, 1);
    }

    // Populate stats for each day
    policies.forEach((policy) => {
      const day = format(new Date(policy.dateSold), 'yyyy-MM-dd');
      if (dayStats[day]) {
        dayStats[day].issued += policy.annualPremium || 0;
        dayStats[day].chargeBackOwed += policy.terminated
          ? policy.annualPremium
          : 0;
        dayStats[day].totalPolicies += 1;
      }
    });

    // Convert dayStats to an array (optional, if needed for the frontend)
    const statsArray = Object.keys(dayStats).map((date) => ({
      date,
      ...dayStats[date],
    }));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      stats: statsArray, // Or use dayStats if an object is preferred
      totalPolicies: policies.length,
    };
  }

  async createOrUpdateStaticData(
    data: Partial<StaticData>,
    keepOld: boolean,
  ): Promise<StaticData> {
    const existingData = await this.staticDataModel.findOne();

    if (existingData) {
      if (keepOld) {
        // Append new data to existing data
        existingData.state = [...existingData.state, ...(data.state || [])];
        existingData.carrier = [
          ...existingData.carrier,
          ...(data.carrier || []),
        ];
        return existingData.save();
      } else {
        // Replace existing data
        existingData.state = data.state || [];
        existingData.carrier = data.carrier || [];
        return existingData.save();
      }
    } else {
      // Create new data
      const newStaticData = new this.staticDataModel(data);
      return newStaticData.save();
    }
  }

  // get static data
  async getStaticData(): Promise<StaticData> {
    return this.staticDataModel
      .findOne()
      .select('state.name state.code carrier.name carrier.code carrier.image')
      .exec();
  }

  async updateHierarchy() {
    const c = await createAgentsHierarchy(
      this.employeeModel,
      this.agentHierarchyModel,
    );
    return c;
  }

  async findByNpn(npn: string) {
    const result = await this.employeeModel.findOne({ npn });
    return result.toJSON();
  }

  async findUserByNpn(npn: string) {
    const result = await this.userModel.findOne({ userName: npn });
    return result.toJSON();
  }

  async getUplineChain(npn: string) {
    const result = await this.employeeModel.aggregate([
      { $match: { npn } },
      {
        $graphLookup: {
          from: 'employees',
          startWith: '$agentsUplineNpn',
          connectFromField: 'agentsUplineNpn',
          connectToField: 'npn',
          as: 'uplineChain',
        },
      },
      { $unwind: '$uplineChain' },
      { $replaceRoot: { newRoot: '$uplineChain' } },
    ]);
    return result;
  }
}
