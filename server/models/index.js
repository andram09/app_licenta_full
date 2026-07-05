import sequelize from "../config/db.config.js";

import { User } from "./User.js";
import { Trip } from "./Trip.js";
import { TripDay } from "./TripDay.js";
import { Objective } from "./Objective.js";
import { Expense } from "./Expense.js";
import { ExpenseCategory } from "./ExpenseCategory.js";
import { UserToken } from "./UserToken.js";

// RELATII

User.hasMany(Trip, { foreignKey: "id_user", onDelete: "CASCADE" });
Trip.belongsTo(User, { foreignKey: "id_user" });

Trip.hasMany(TripDay, { foreignKey: "id_trip", onDelete: "CASCADE" });
TripDay.belongsTo(Trip, { foreignKey: "id_trip" });

Trip.hasMany(Objective, { foreignKey: 'id_trip', onDelete: 'CASCADE' });
Objective.belongsTo(Trip, { foreignKey: 'id_trip' });

TripDay.hasMany(Objective, { foreignKey: "id_trip_day", onDelete: "CASCADE" });
Objective.belongsTo(TripDay, { foreignKey: "id_trip_day" });

Trip.hasMany(Expense, { foreignKey: "id_trip", onDelete: "CASCADE" });
Expense.belongsTo(Trip, { foreignKey: "id_trip" });

ExpenseCategory.hasMany(Expense, { foreignKey: "id_expense_category" });
Expense.belongsTo(ExpenseCategory, { foreignKey: "id_expense_category" });

User.hasMany(UserToken, { foreignKey: "id_user", onDelete: "CASCADE" });
UserToken.belongsTo(User, { foreignKey: "id_user" });

Objective.hasMany(Expense, {foreignKey: "id_objective", onDelete:"CASCADE"});
Expense.belongsTo(Objective, { foreignKey: "id_objective", onDelete: "CASCADE" });

export {
  sequelize,
  User,
  Trip,
  TripDay,
  Objective,
  Expense,
  ExpenseCategory,
  UserToken
};
