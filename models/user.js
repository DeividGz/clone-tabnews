import database from "infra/database.js";
import password from "models/password.js";
import { ValidationError, NotFoundError } from "infra/errors";

async function findOneByUsername(username) {
  const userFound = await runSelectQuery(username);

  return userFound;

  async function runSelectQuery(username) {
    const results = await database.query({
      text: `
        SELECT
          *
        FROM
          users
        WHERE
          LOWER(username) = LOWER($1)
        LIMIT
          1
        ;`,
      values: [username],
    });

    if (results.rowCount === 0) {
      throw new NotFoundError({
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username está digitado corretamente.",
      });
    }

    return results.rows[0];
  }
}

async function create(userInputValues) {
  await validateUniqueFields(["username", "email"], userInputValues);
  await hashPasswordInObject(userInputValues);

  const newUser = await runInsertQuery(userInputValues);
  return newUser;

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

async function update(username, userInputValues) {
  const currentUser = await findOneByUsername(username);

  let fieldsToValidateAsUnique = [];

  if ("username" in userInputValues) {
    fieldsToValidateAsUnique.push("username");
  }

  if ("email" in userInputValues) {
    fieldsToValidateAsUnique.push("email");
  }

  if (fieldsToValidateAsUnique.length > 0) {
    await validateUniqueFields(fieldsToValidateAsUnique, userInputValues);
  }

  if ("password" in userInputValues) {
    await hashPasswordInObject(userInputValues);
  }

  const userWithNewValues = { ...currentUser, ...userInputValues };

  const updatedUser = await runUpdateQuery(userWithNewValues);

  return updatedUser;

  async function runUpdateQuery(userWithNewValues) {
    const results = await database.query({
      text: `
        UPDATE
          users
        SET
          username = $2,
          email = $3,
          password = $4,
          updated_at = timezone('utc', now())
        WHERE
          id = $1
        RETURNING
          *
      ;`,
      values: [
        userWithNewValues.id,
        userWithNewValues.username,
        userWithNewValues.email,
        userWithNewValues.password,
      ],
    });

    return results.rows[0];
  }
}

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
          action: `Utilize outro ${fieldName} para realizar esta operação.`,
        });
      }
    }
  }

  return results.rows[0];
}

async function hashPasswordInObject(userInputValues) {
  const hashedPassword = await password.hash(userInputValues.password);
  userInputValues.password = hashedPassword;
}

const user = {
  create,
  findOneByUsername,
  update,
};

export default user;
