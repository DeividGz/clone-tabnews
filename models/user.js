import database from "infra/database.js";
import { ValidationError } from "infra/errors";

async function create(userInputValues) {
  await validateUniqueFields(["email", "username"], userInputValues);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

  async function validateUniqueFields(uniqueFieldNames, userInputValues) {
    const valuesByFields = uniqueFieldNames.map((f) => userInputValues[f]);

    const whereCondition = uniqueFieldNames
      .map((f, index) => `LOWER(${f}) = LOWER($${index + 1})`)
      .join(" OR ");

    const results = await database.query({
      text: `
        SELECT
          ${uniqueFieldNames.join(", ")}
        FROM
          users
        WHERE
          ${whereCondition}
      ;`,
      values: valuesByFields,
    });

    if (results.rowCount > 0) {
      for (const fieldName of uniqueFieldNames) {
        const isDuplicated = results.rows.find(
          (row) =>
            row[fieldName].toLowerCase() ===
            userInputValues[fieldName].toLowerCase(),
        );

        if (isDuplicated) {
          throw new ValidationError({
            message: `O ${fieldName} informado já está sendo utilizado.`,
            action: `Utilize outro ${fieldName} para realizar o cadastro.`,
          });
        }
      }
    }

    return results.rows[0];
  }

  async function runInsertQuery(userInputValues) {
    const results = await database.query({
      text: `
        INSERT INTO
          users (username, email, password)
        VALUES
          ($1, $2, $3)
        RETURNING
          *
      ;`,
      values: [
        userInputValues.username,
        userInputValues.email,
        userInputValues.password,
      ],
    });

    return results.rows[0];
  }
}

const user = {
  create,
};

export default user;
