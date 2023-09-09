import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import gql from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";

/**
 * Our schema definition, including the extension of the schema to support federation directives.
 */
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Query {
    me: User
    users: [User!]!
  }

  type User @key(fields: "id") {
    id: ID!
    name: String
  }
`;

/**
 * A little fake database for demo purposes.
 */
const usersDatabase = [
  { id: "1", name: "Johnnie" },
  { id: "2", name: "Annie" },
  { id: "3", name: "Gerald" },
  { id: "4", name: "Bobby" },
  { id: "5", name: "Agnes" },
];

/**
 * Fetch users by id.
 *
 * NOTE: A real-world implementation would need a dataloader to avoid the N+1 problem.
 */
const fetchUserById = async (id: string) =>
  usersDatabase.find((user) => user.id === id);

/**
 * Set up all resolvers to define our queries/mutations as well as how to resolve
 * references to data exposed by this subgraph.
 */
const resolvers = {
  Query: {
    me: () => fetchUserById("1"),

    users: () => {
      return usersDatabase;
    },
  },

  // We define how another subgraph can resolve a user.
  User: {
    __resolveReference(user: { id: string }) {
      console.log(`[users] Resolving reference for user by id: ${user.id}`);
      return fetchUserById(user.id);
    },
  },
};

/**
 * Set up the subgraph server and start it.
 */
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, {
  listen: { port: 4070 },
})
  .then(({ url }) => {
    console.log(`🚀  Users service is ready at ${url}`);
  })
  .catch((err) => {
    console.log(err);
  });
