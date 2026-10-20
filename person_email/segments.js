export const subscribers = {
  name: 'Email Subscribers',
  definition: {
    and: [
      {
        path: '@engine9/schemas/person_email:segment_definition_clause:emails',
        options: {
          subscriptionStatus: 'Subscribed'
        }
      }
    ]
  }
};
export default {
  subscribers
};
