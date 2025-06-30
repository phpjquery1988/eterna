import { Injectable } from '@nestjs/common';
@Injectable()
export class StateService {
  states = [
    {
      name: 'Alabama',
      postal: 'AL',
      isState: true,
    },
    {
      name: 'Alaska',
      postal: 'AK',
      isState: true,
    },
    {
      name: 'Arizona',
      postal: 'AZ',
      isState: true,
    },
    {
      name: 'Arkansas',
      postal: 'AR',
      isState: true,
    },
    {
      name: 'California',
      postal: 'CA',
      isState: true,
    },
    {
      name: 'Colorado',
      postal: 'CO',
      isState: true,
    },
    {
      name: 'Connecticut',
      postal: 'CT',
      isState: true,
    },
    {
      name: 'Delaware',
      postal: 'DE',
      isState: true,
    },
    {
      name: 'Florida',
      postal: 'FL',
      isState: true,
    },
    {
      name: 'Georgia',
      postal: 'GA',
      isState: true,
    },
    {
      name: 'Hawaii',
      postal: 'HI',
      isState: true,
    },
    {
      name: 'Idaho',
      postal: 'ID',
      isState: true,
    },
    {
      name: 'Illinois',
      postal: 'IL',
      isState: true,
    },
    {
      name: 'Indiana',
      postal: 'IN',
      isState: true,
    },
    {
      name: 'Iowa',
      postal: 'IA',
      isState: true,
    },
    {
      name: 'Kansas',
      postal: 'KS',
      isState: true,
    },
    {
      name: 'Kentucky',
      postal: 'KY',
      isState: true,
    },
    {
      name: 'Louisiana',
      postal: 'LA',
      isState: true,
    },
    {
      name: 'Maine',
      postal: 'ME',
      isState: true,
    },
    {
      name: 'Maryland',
      postal: 'MD',
      isState: true,
    },
    {
      name: 'Massachusetts',
      postal: 'MA',
      isState: true,
    },
    {
      name: 'Michigan',
      postal: 'MI',
      isState: true,
    },
    {
      name: 'Minnesota',
      postal: 'MN',
      isState: true,
    },
    {
      name: 'Mississippi',
      postal: 'MS',
      isState: true,
    },
    {
      name: 'Missouri',
      postal: 'MO',
      isState: true,
    },
    {
      name: 'Montana',
      postal: 'MT',
      isState: true,
    },
    {
      name: 'Nebraska',
      postal: 'NE',
      isState: true,
    },
    {
      name: 'Nevada',
      postal: 'NV',
      isState: true,
    },
    {
      name: 'New Hampshire',
      postal: 'NH',
      isState: true,
    },
    {
      name: 'New Jersey',
      postal: 'NJ',
      isState: true,
    },
    {
      name: 'New Mexico',
      postal: 'NM',
      isState: true,
    },
    {
      name: 'New York',
      postal: 'NY',
      isState: true,
    },
    {
      name: 'North Carolina',
      postal: 'NC',
      isState: true,
    },
    {
      name: 'North Dakota',
      postal: 'ND',
      isState: true,
    },
    {
      name: 'Ohio',
      postal: 'OH',
      isState: true,
    },
    {
      name: 'Oklahoma',
      postal: 'OK',
      isState: true,
    },
    {
      name: 'Oregon',
      postal: 'OR',
      isState: true,
    },
    {
      name: 'Pennsylvania',
      postal: 'PA',
      isState: true,
    },
    {
      name: 'Rhode Island',
      postal: 'RI',
      isState: true,
    },
    {
      name: 'South Carolina',
      postal: 'SC',
      isState: true,
    },
    {
      name: 'South Dakota',
      postal: 'SD',
      isState: true,
    },
    {
      name: 'Tennessee',
      postal: 'TN',
      isState: true,
    },
    {
      name: 'Texas',
      postal: 'TX',
      isState: true,
    },
    {
      name: 'Utah',
      postal: 'UT',
      isState: true,
    },
    {
      name: 'Vermont',
      postal: 'VT',
      isState: true,
    },
    {
      name: 'Virginia',
      postal: 'VA',
      isState: true,
    },
    {
      name: 'Washington',
      postal: 'WA',
      isState: true,
    },
    {
      name: 'West Virginia',
      postal: 'WV',
      isState: true,
    },
    {
      name: 'Wisconsin',
      postal: 'WI',
      isState: true,
    },
    {
      name: 'Wyoming',
      postal: 'WY',
      isState: true,
    },
    {
      name: 'District of Columbia',
      postal: 'DC',
      isState: false,
    },
  ];

  constructor() {}

  getStates() {
    return this.states;
  }
}
