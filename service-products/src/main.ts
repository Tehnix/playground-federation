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
    product(id: ID!): Product
    products: [Product!]!
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String
    price: String
  }

  type User @key(fields: "id") {
    id: ID!
    purchases: [Product]
  }
`;

/**
 * A little fake database for demo purposes.
 */
const productDatabase = [
  { id: "1234", name: "Lunchpack", price: "$10" },
  { id: "5678", name: "Nappies", price: "$10" },
  { id: "9012", name: "Blanket", price: "$10" },
  { id: "3456", name: "Frog", price: "$10" },
];
const purchasesDatabase = [
  { userId: "1", purchases: [{ id: "1234" }, { id: "5678" }] },
  { userId: "2", purchases: [{ id: "9012" }, { id: "3456" }] },
  { userId: "3", purchases: [{ id: "9012" }] },
  { userId: "4", purchases: [{ id: "3456" }] },
];

/**
 * Fetch products by id and various other ways.
 *
 * NOTE: A real-world implementation would need a dataloader to avoid the N+1 problem.
 */
const fetchByProductId = async (id) =>
  productDatabase.find((product) => product.id === id);

const fetchPurchasesByUser = async (id) => {
  const purchases =
    purchasesDatabase.find((purchase) => purchase.userId === id)?.purchases ??
    [];
  return purchases.map((purchase) => fetchByProductId(purchase.id));
};

/**
 * Set up all resolvers to define our queries/mutations as well as how to resolve
 * references to data exposed by this subgraph.
 */
const resolvers = {
  Query: {
    product: (id) => fetchByProductId(id),
    products: () => productDatabase,
  },
  // We define how another subgraph can resolve a product.
  Product: {
    __resolveReference(product) {
      console.log(
        `[products] Resolving reference for product by id: ${product.id}`
      );
      return fetchByProductId(product.id);
    },
  },

  // Since we are contributing keys to User we must define a reference resolver for it.
  User: {
    __resolveReference: async (user) => {
      console.log(`[products] Resolving reference for user by id: ${user.id}`);
      const purchases = await fetchPurchasesByUser(user.id);
      return {
        purchases,
      };
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
  listen: { port: 4080 },
})
  .then(({ url }) => {
    console.log(`🚀  Products service is ready at ${url}`);
  })
  .catch((err) => {
    console.log(err);
  });
