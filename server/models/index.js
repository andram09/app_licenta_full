const sequelize = require('../config/db.config');
const User = require('./User');
const Trip = require('./Trip');
const TripDay = require('./TripDay');
const Objective = require('./Objective');
const Category = require('./Category');
const Expense = require('./Expense');
const ExpenseCategory = require('./ExpenseCategory');
//auth
const RefreshToken = require('./RefreshToken');
const UserToken = require('./UserToken');

// --- RELATII ---

// User -> Trips
User.hasMany(Trip, { foreignKey: 'id_user', onDelete: 'CASCADE' });
Trip.belongsTo(User, { foreignKey: 'id_user' });

// Trip -> TripDays
Trip.hasMany(TripDay, { foreignKey: 'id_trip', onDelete: 'CASCADE' });
TripDay.belongsTo(Trip, { foreignKey: 'id_trip' });

// TripDay -> Objectives
TripDay.hasMany(Objective, { foreignKey: 'id_trip_day', onDelete: 'CASCADE' });
Objective.belongsTo(TripDay, { foreignKey: 'id_trip_day' });

// Category -> Objectives
Category.hasMany(Objective, { foreignKey: 'id_category' });
Objective.belongsTo(Category, { foreignKey: 'id_category' });

// Trip -> Expenses
Trip.hasMany(Expense, { foreignKey: 'id_trip', onDelete: 'CASCADE' });
Expense.belongsTo(Trip, { foreignKey: 'id_trip' });

// ExpenseCategory -> Expenses
ExpenseCategory.hasMany(Expense, { foreignKey: 'id_expense_category' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'id_expense_category' });

//---auth---
// User -> RefreshTokens
// La stergerea unui user, stergem si toate refresh token-urile sale
User.hasMany(RefreshToken, { foreignKey: 'id_user', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'id_user' });

// User -> UserTokens
// La stergerea unui user, stergem si toate token-urile sale de resetare parola
User.hasMany(UserToken, { foreignKey: 'id_user', onDelete: 'CASCADE' });
UserToken.belongsTo(User, { foreignKey: 'id_user' });

module.exports = {
  sequelize,
  User,
  Trip,
  TripDay,
  Objective,
  Category,
  Expense,
  ExpenseCategory,
  RefreshToken,
  UserToken
};