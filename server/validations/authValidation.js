const Joi = require('joi');

// Schema de validare pentru parola - definita separat pentru a fi reutilizata
// in mai multe scheme fara duplicare de cod
const passwordSchema = Joi.string()
  .min(8)
  .max(50)
  .pattern(new RegExp('(?=.*[a-z])'))
  .pattern(new RegExp('(?=.*[A-Z])'))
  .pattern(new RegExp('(?=.*[0-9])'))
  .pattern(new RegExp('(?=.*[!@#$%^&*])'))
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 50 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (!@#$%^&*)',
    'any.required': 'Password is required'
  });

// Schema pentru inregistrare
const registerSchema = Joi.object({
  first_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),

  last_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),

  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email cannot exceed 100 characters',
      'any.required': 'Email is required'
    }),

  password: passwordSchema
});

// Schema pentru autentificare
// La login nu verificam complexitatea parolei - doar ca exista
// Motivul: un user creat inainte de introducerea regulilor nu trebuie blocat
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Schema pentru cererea de resetare parola
// Userul introduce doar email-ul pentru a primi link-ul de reset
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Schema pentru resetarea efectiva a parolei
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),

  password: passwordSchema,

  // Joi.ref('password') compara automat cu valoarea campului password
  // din acelasi obiect, fara logica manuala
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    })
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};