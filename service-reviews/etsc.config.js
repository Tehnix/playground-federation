const graphqlLoaderPlugin =
  require("@luckycatfactory/esbuild-graphql-loader").default;

module.exports = {
  // Supports all esbuild.build options
  esbuild: {
    minify: true,
    target: "esnext",
    plugins: [graphqlLoaderPlugin()],
  },
};
