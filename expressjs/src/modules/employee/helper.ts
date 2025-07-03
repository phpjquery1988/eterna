import { AgentHierarchy } from "./entities/csv-uplao/agents.employee.schema"
import { Employee } from "./entities/employee.schema"
import { Model } from "mongoose"
import { v4 as uuidv4 } from 'uuid';

export class employeeHierarchyInterface {
   employeeId: string
   supervisorId: string
}

export async function manageEmployeeHierarchy(
   employeeHierarchy: employeeHierarchyInterface,
   employeeModel: Model<Employee>,
   employeeHR: string[]
): Promise<void> {

   if (employeeHR && employeeHR.length > 0) {
      console.log("🚀 ~ manageEmployeeHierarchy ~ employeeHR:", employeeHR)
      // clean extra sapces from employeeHRE
      employeeHR = employeeHR.map((item) => {
         return item.trim();
      })
   }
   const { employeeId } = employeeHierarchy;
   await employeeModel.updateOne(
      { _id: employeeId },
      {
         $set: {
            employeeHierarchy: employeeHR
               ||
               []
         }
      });
   return;
}


export function matchStates(incomingStates, availableStates) {
   // Create a mapping of codes to approved status
   const stateMap = new Set(incomingStates);
   // Transform availableStates to the desired structure
   return availableStates.map(state => {
      return {
         name: state.code,
         status: stateMap.has(state.code),
      };
   });
}


export async function createAgentsHierarchy(employeeModel: Model<Employee>, agentHierarchyModel: Model<AgentHierarchy>) {
   const allEmployees = await employeeModel.find().sort({ npn: 1 });
   for (const employee of allEmployees) {
      const uuid = uuidv4();
      let agentHierarchy = await agentHierarchyModel.findOne({ batchId: employee?.batchId });
      const uplineEmployee = await employeeModel.find({ agentsUplineNpn: employee?.npn });
      const npns = uplineEmployee.map(emp => emp.npn);
      if (!agentHierarchy) {
         agentHierarchy = new agentHierarchyModel({
            batchId: uuid,
            hierarchy: [...npns, employee?.npn]
         });
         employee.batchId = uuid;
      } else {
         const newHierarchy = [...npns, employee?.npn];
         // Ensure unique values in hierarchy
         agentHierarchy.hierarchy = Array.from(new Set([...(agentHierarchy.hierarchy || []), ...newHierarchy]));
      }
      await employee.save();
      await agentHierarchy.save();
   }
}




