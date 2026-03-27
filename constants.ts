
export const ADMIN_EMAILS = [
  'jeanlucasgontijo.15@gmail.com', // Seu email
  'jeangontijoo@gmail.com',
  'gabriejvieira@gmail.com',
  'rodriguesrichardy040@gmail.com',
  'admin@rotafinanceira.com.br',
  'tester@rotafinanceira.com.br',
  'teste@gmail.com',
  'test@test.com',
  'allysonbreno003@gmail.com'
];

export const isUserAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export const TERMS_OF_USE = `
Ao utilizar o RotaFinanceira, você concorda com os seguintes termos:

1. USO DO SISTEMA: O RotaFinanceira é uma ferramenta de auxílio na gestão financeira pessoal para entregadores. Os dados inseridos são de sua inteira responsabilidade.

2. PRIVACIDADE E DADOS: Seus dados de lançamentos e perfil são armazenados localmente no seu dispositivo e sincronizados na nuvem (Firebase) para sua segurança e acesso em múltiplos dispositivos. Não compartilhamos seus dados financeiros com terceiros.

3. ISENÇÃO DE RESPONSABILIDADE: O aplicativo fornece cálculos baseados nos dados inseridos por você. Não nos responsabilizamos por decisões financeiras, perdas ou erros de cálculo decorrentes do uso da ferramenta.

4. ASSINATURA PRO: Recursos avançados e backup em nuvem podem exigir uma assinatura ativa. O cancelamento pode ser feito a qualquer momento através das configurações.

5. ALTERAÇÕES: Reservamo-nos o direito de atualizar estes termos e as funcionalidades do aplicativo para melhor atender aos usuários.

Ao criar sua conta, você confirma que leu e aceita estes termos.
`;
