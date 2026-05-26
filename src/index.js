import fastify from "fastify";

const app = fastify({
  logger: true,
});

app.get("/ready", async (request, reply) => {
  reply.status(200).send();
});

app.post("/fraud-score", async (request, reply) => {
  const transaction = request.body;

  const flattenTransaction = (data) => {
    const { transaction, ...rest } = data;

    return {
      ...rest,
      ...transaction,
    };
  };

  const flattenedTransaction = flattenTransaction(transaction);

  return reply.status(200).send(flattenedTransaction);
});

app.listen({ port: 9999 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});
