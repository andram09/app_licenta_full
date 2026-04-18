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
    'string.min': 'Parola trebuie să aibă cel puțin 8 caractere',
    'string.max': 'Parola nu poate depăși 50 de caractere',
    'any.required': 'Parola este obligatorie'
  });

export const registerSchema = Joi.object({
  first_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Prenumele trebuie să aibă cel puțin 2 caractere',
      'string.max': 'Prenumele nu poate depăși 50 de caractere',
      'any.required': 'Prenumele este obligatoriu'
    }),

  last_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Numele trebuie să aibă cel puțin 2 caractere',
      'string.max': 'Numele nu poate depăși 50 de caractere',
      'any.required': 'Numele este obligatoriu'
    }),

  email: Joi.string()
    .email()
    .max(100)
    .required()
    .messages({
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
    .email()
    .required()
    .messages({
      'string.email': 'Adresa de email nu este validă',
      'any.required': 'Email-ul este obligatoriu'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Parola este obligatorie'
    })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Adresa de email nu este validă',
      'any.required': 'Email-ul este obligatoriu'
    })
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Token-ul de resetare este obligatoriu'
    }),

  password: passwordSchema,

  // Joi.ref('password') compara automat cu valoarea campului password
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Parolele nu coincid',
      'any.required': 'Confirmarea parolei este obligatorie'
    })
});

export const updateProfileSchema = Joi.object({
  first_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Prenumele trebuie să aibă cel puțin 2 caractere',
      'string.max': 'Prenumele nu poate depăși 50 de caractere',
      'any.required': 'Prenumele este obligatoriu'
    }),

  last_name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Numele trebuie să aibă cel puțin 2 caractere',
      'string.max': 'Numele nu poate depăși 50 de caractere',
      'any.required': 'Numele este obligatoriu'
    })
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'any.required': 'Parola curentă este obligatorie'
    }),

  new_password: passwordSchema,

  // Joi.ref('new_password') compara automat cu valoarea campului new_password
  confirm_new_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Parolele nu coincid',
      'any.required': 'Confirmarea parolei este obligatorie'
    })
});
