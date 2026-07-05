import Joi from "joi";

export const passwordSchema = Joi.string()
  .min(8)
  .max(50)
  .custom((value, helpers) => {
    const lipseste = [];
    if (!/[a-z]/.test(value)) lipseste.push('o literă mică');
    if (!/[A-Z]/.test(value)) lipseste.push('o literă mare');
    if (!/[0-9]/.test(value)) lipseste.push('o cifră');
    if (!/[!@#$%^&*]/.test(value)) lipseste.push('un caracter special (!@#$%^&*)');
    if (lipseste.length > 0) {
      return helpers.message(`Parola trebuie să conțină: ${lipseste.join(', ')}`);
    }
    return value;
  })
  .required()
  .messages({
    'string.empty': 'Parola este obligatorie',
    'string.min': 'Parola trebuie să aibă cel puțin 8 caractere',
    'string.max': 'Parola nu poate depăși 50 de caractere',
    'any.required': 'Parola este obligatorie'
  });

// Numele accepta doar litere (inclusiv diacritice romanesti), spatiu,
// cratima si apostrof - pentru nume compuse (ex: "Ana-Maria", "O'Brien").
// .trim() elimina spatiile de la capete inainte de validare, deci "  " devine "" (gol).
const NAME_PATTERN = /^[A-Za-zĂÂÎȘȚăâîșțÀ-ÿ]+([ '-][A-Za-zĂÂÎȘȚăâîșțÀ-ÿ]+)*$/;

const nameSchema = (label, labelGen) =>
  Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(NAME_PATTERN)
    .required()
    .messages({
      'string.empty': `${label} este ${labelGen}`,
      'string.min': `${label} trebuie să aibă cel puțin 2 caractere`,
      'string.max': `${label} nu poate depăși 50 de caractere`,
      'string.pattern.base': `${label} poate conține doar litere`,
      'any.required': `${label} este ${labelGen}`
    });

export const registerSchema = Joi.object({
  first_name: nameSchema('Prenumele', 'obligatoriu'),

  last_name: nameSchema('Numele', 'obligatoriu'),

  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .max(100)
    .required()
    .messages({
      'string.empty': 'Email-ul este obligatoriu',
      'string.email': 'Adresa de email nu este validă',
      'string.max': 'Email-ul nu poate depăși 100 de caractere',
      'any.required': 'Email-ul este obligatoriu'
    }),

  password: passwordSchema
});

// La login nu verificam complexitatea parolei - doar ca exista
// Motivul: un user creat inainte de introducerea regulilor nu trebuie blocat
export const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.empty': 'Email-ul este obligatoriu',
      'string.email': 'Adresa de email nu este validă',
      'any.required': 'Email-ul este obligatoriu'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Parola este obligatorie',
      'any.required': 'Parola este obligatorie'
    })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.empty': 'Email-ul este obligatoriu',
      'string.email': 'Adresa de email nu este validă',
      'any.required': 'Email-ul este obligatoriu'
    })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Token-ul de resetare este obligatoriu',
      'any.required': 'Token-ul de resetare este obligatoriu'
    }),

  password: passwordSchema,

  // Joi.ref('password') compara automat cu valoarea campului password
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'string.empty': 'Confirmarea parolei este obligatorie',
      'any.only': 'Parolele nu coincid',
      'any.required': 'Confirmarea parolei este obligatorie'
    })
});

export const updateProfileSchema = Joi.object({
  first_name: nameSchema('Prenumele', 'obligatoriu'),

  last_name: nameSchema('Numele', 'obligatoriu')
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Parola curentă este obligatorie',
      'any.required': 'Parola curentă este obligatorie'
    }),

  new_password: passwordSchema,

  // Joi.ref('new_password') compara automat cu valoarea campului new_password
  confirm_new_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'string.empty': 'Confirmarea parolei este obligatorie',
      'any.only': 'Parolele nu coincid',
      'any.required': 'Confirmarea parolei este obligatorie'
    })
});
