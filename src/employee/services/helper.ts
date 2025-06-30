import { Policy } from '../entities/policy.schema';

export function formatData(data) {
  return data.map((item) => {
    // Format the carrier field
    item.carrier = item.carrier.replace(/\s+/g, '_').toUpperCase();

    // Format the state keys to uppercase
    Object.keys(item).forEach((key) => {
      if (key.length === 2) {
        // Check if it's a state abbreviation
        item[key.toUpperCase()] = item[key];
        delete item[key]; // Remove the old lowercase key
      }
    });

    return item;
  });
}

export const getActivePolicies = (policies: Policy[]) => {
  const activePolicies = policies.filter(
    (policy) =>
      policy.consolidatedPolicyStatus.toLowerCase() === 'active' ||
      /^pending\b/i.test(policy.consolidatedPolicyStatus),
  );
  return activePolicies;
};

export const calculatePersistencyForRange = (policies: Policy[]) => {
  const activePolicies = getActivePolicies(policies);
  return (activePolicies.length / policies.length) * 100;
};

export const toScreamingSnakeCase = (input: string) => {
  // Insert a space between a lowercase and uppercase letter (for camelCase words)
  const withSpaces = input.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Split the string by spaces, hyphens, or underscores
  const words = withSpaces.split(/[\s-_]+/);

  // Convert each word to uppercase and join them with underscores
  return words.map((word) => word.toUpperCase()).join('_');
};
