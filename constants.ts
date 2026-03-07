
export const ADMIN_EMAILS = [
  'jeanlucasgontijo.15@gmail.com', // Seu email
  'gabriejvieira@gmail.com',
  'admin@rotafinanceira.com.br',
  'tester@rotafinanceira.com.br'
];

export const isUserAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
