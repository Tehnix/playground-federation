# Playground: Federation
Playground to test out Federated GraphQL.

Install the rover CLI:

```bash
curl -sSL https://rover.apollo.dev/nix/latest | sh
```

and the router itself:

```bash
curl -sSL https://router.apollo.dev/download/nix/latest | sh
```

You first start the three subgraphs:

```bash
$ cd service-users
$ npm run dev
```

```bash
$ cd service-reviews
$ npm run dev
```

```bash
$ cd service-products
$ npm run dev
```

We can then compose our subgraphs:

```bash
$ rover supergraph compose --config ./supergraph-config.yaml > supergraph.graphql
```

And then start the router that pieces them together:

```bash
$ ./router --config router.yaml --supergraph=supergraph.graphql --dev --hot-reload
```


# Resources

- [Federation quickstart](https://www.apollographql.com/docs/federation/quickstart/local-subgraphs)
- [Configuring the router](https://www.apollographql.com/docs/router/configuration/overview/)
- [What are entities in Federated GraphQL](https://www.apollographql.com/docs/federation/entities/#defining-an-entity)
