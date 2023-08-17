import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import gql from "graphql-tag";
import { buildSubgraphSchema } from "@apollo/subgraph";
import DataLoader from "dataloader";

/**
 * Our schema definition, including the extension of the schema to support federation directives.
 */
const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@requires", "@external"]
    )

  type Query {
    review(id: ID!): Review
    reviews: [Review!]!
  }

  type Review @key(fields: "id") {
    id: ID!
    body: String
    author: User
    product: Product
  }

  type User @key(fields: "id") {
    id: ID!
    name: String @external
    greeting: String @requires(fields: "name")
    reviews: [Review]
  }

  type Product @key(fields: "id") {
    id: ID!
    reviews: [Review]
  }
`;

/**
 * A little fake database for demo purposes.
 */
const reviewDatabase = [
  {
    id: "abs32",
    body: "Good",
    author: { id: "1" },
    product: { id: "1234" },
  },
  {
    id: "kjj23",
    body: "I like it!",
    author: { id: "3" },
    product: { id: "5678" },
  },
  {
    id: "ll245",
    body: "Not sure",
    author: { id: "4" },
    product: { id: "9012" },
  },
  {
    id: "o2jk1",
    body: "It's okay",
    author: { id: "2" },
    product: { id: "3456" },
  },
];

/**
 * Fetch reviews by id and various other ways.
 *
 * NOTE: A real-world implementation would need a dataloader to avoid the N+1 problem. See
 * below for this setup.
 */
const fetchReviewById = async (id) =>
  reviewDatabase.filter((review) => review.id === id);

const fetchReviewByUser = async (id) =>
  reviewDatabase.filter((review) => review.author.id === id);

const fetchReviewByProduct = async (id) =>
  reviewDatabase.filter((review) => review.product.id === id);

/**
 * Construct a way to batch fetch reviews by ids.
 *
 * NOTE: It's important to keep the ordering and structure of the input ids and the returned
 * array of reviews the same. It's one of the guarantees that the data loader needs to function.
 */
const batchFetchReviews = async (byFn, ids) => {
  console.log(`[reviews] Batch fetching reviews by ids: ${ids}`);
  return ids.map((id) => byFn(id));
};

/**
 * Set up a data loader than can take a lookup function and batch fetch reviews by ids.
 *
 * NOTE: The object needs to be created outside of the resolver so that it will keep its state across calls and requests.
 */
const byIdLoader = new DataLoader((ids) =>
  batchFetchReviews(fetchReviewById, ids)
);
const byUserLoader = new DataLoader((ids) =>
  batchFetchReviews(fetchReviewByUser, ids)
);
const byProductLoader = new DataLoader((ids) =>
  batchFetchReviews(fetchReviewByProduct, ids)
);

/**
 * Set up all resolvers to define our queries/mutations as well as how to resolve
 * references to data exposed by this subgraph.
 */
const resolvers = {
  Query: {
    review: (id) => byIdLoader.load(id)?.[0],

    reviews: () => {
      return reviewDatabase;
    },
  },

  // We define how another subgraph can resolve a review.
  Review: {
    __resolveReference: async (review) => {
      console.log(
        `[reviews] Resolving reference for review by id: ${review.id}`
      );
      return byIdLoader.load(review.id);
    },
  },

  // Since we are contributing keys to User we must define a reference resolver for it.
  User: {
    __resolveReference: async (user) => {
      console.log(`[reviews] Resolving reference for user by id: ${user.id}`);
      const reviews = await byUserLoader.load(user.id);
      return {
        // We spread the user object here to give our computed fields access to the user's data that
        // we required via the @requires directive.
        ...user,
        reviews,
      };
    },

    greeting: (user) => `Hello ${user.name}!`,
  },

  // Since we are contributing keys to Product we must define a reference resolver for it.
  Product: {
    __resolveReference: async (product) => {
      console.log(
        `[reviews] Resolving reference for product by id: ${product.id}`
      );
      const reviews = await byProductLoader.load(product.id);
      return { reviews };
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
  listen: { port: 4090 },
})
  .then(({ url }) => {
    console.log(`🚀  Reviews service is ready at ${url}`);
  })
  .catch((err) => {
    console.log(err);
  });
