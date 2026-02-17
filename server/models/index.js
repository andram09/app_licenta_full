import sequelize from "../config/db.config.js";

import { User } from "./User.js";
import { Trip } from "./Trip.js";
import { TripDay } from "./TripDay.js";
import { Objective } from "./Objective.js";
import { Category } from "./Category.js";
import { Expense } from "./Expense.js";
import { ExpenseCategory } from "./ExpenseCategory.js";
import { UserToken } from "./UserToken.js";

// RELATII

User.hasMany(Trip, { foreignKey: "id_user", onDelete: "CASCADE" });
Trip.belongsTo(User, { foreignKey: "id_user" });

Trip.hasMany(TripDay, { foreignKey: "id_trip", onDelete: "CASCADE" });
TripDay.belongsTo(Trip, { foreignKey: "id_trip" });

TripDay.hasMany(Objective, { foreignKey: "id_trip_day", onDelete: "CASCADE" });
Objective.belongsTo(TripDay, { foreignKey: "id_trip_day" });

Category.hasMany(Objective, { foreignKey: "id_category" });
Objective.belongsTo(Category, { foreignKey: "id_category" });

Trip.hasMany(Expense, { foreignKey: "id_trip", onDelete: "CASCADE" });
Expense.belongsTo(Trip, { foreignKey: "id_trip" });

ExpenseCategory.hasMany(Expense, { foreignKey: "id_expense_category" });
Expense.belongsTo(ExpenseCategory, { foreignKey: "id_expense_category" });

User.hasMany(UserToken, { foreignKey: "id_user", onDelete: "CASCADE" });
UserToken.belongsTo(User, { foreignKey: "id_user" });

export {
  sequelize,
  User,
  Trip,
  TripDay,
  Objective,
  Category,
  Expense,
  ExpenseCategory,
  UserToken
};
