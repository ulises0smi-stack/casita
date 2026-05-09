import { app } from "./app.js";
import { env } from "./lib/env.js";

app.listen(env.PORT, () => {
  console.log(`Casita API listening on port ${env.PORT}`);
});
