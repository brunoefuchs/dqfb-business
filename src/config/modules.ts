import type { ModuleConfig } from '@/types/module';

export const modules: ModuleConfig[] = [
  {
    id: 'transcricao',
    title: 'Transcrição',
    subtitle: 'DQFB',
    label: 'Módulo Alpha',
    description:
      'Transforme áudio em ativos intelectuais com precisão cirúrgica e contexto editorial refinado.',
    icon: 'record_voice_over',
    bgColor: 'bg-primary',
    buttonText: 'Acessar Sistema',
    buttonTextColor: 'text-primary',
    url: process.env.NEXT_PUBLIC_MODULE_TRANSCRICAO_URL ?? '#',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    subtitle: 'DQFB',
    label: 'Módulo Corporate',
    description:
      'Gestão de tesouraria e fluxo de caixa com dashboards inteligentes para tomada de decisão executiva.',
    icon: 'payments',
    bgColor: 'bg-[#0a1f44]',
    buttonText: 'Visualizar Fluxo',
    buttonTextColor: 'text-[#0a1f44]',
    url: process.env.NEXT_PUBLIC_MODULE_FINANCEIRO_URL ?? 'https://financeiro.francaleffi.com.br/',
  },
  {
    id: 'financeiro-pessoal',
    title: 'Financeiro',
    subtitle: 'Pessoal',
    label: 'Módulo Personal',
    description:
      'Planejamento patrimonial e controle de ativos individuais com a segurança DQFB Business.',
    icon: 'account_balance_wallet',
    iconFilled: true,
    bgColor: 'bg-[#0a1f44]',
    buttonText: 'Gerenciar',
    buttonTextColor: 'text-[#0a1f44]',
    url: process.env.NEXT_PUBLIC_MODULE_FINANCEIRO_PESSOAL_URL ?? 'https://financeiro.francaleffi.com.br/',
  },
  {
    id: 'talk',
    title: 'Talk',
    subtitle: 'DQFB',
    label: 'Módulo Connect',
    description:
      'Comunicação direta e segura. Reuniões, chats e compartilhamento de arquivos em ambiente criptografado.',
    icon: 'forum',
    bgColor: 'bg-[#680114]',
    buttonText: 'Entrar na Sala',
    buttonTextColor: 'text-primary',
    url: process.env.NEXT_PUBLIC_MODULE_TALK_URL ?? '#',
  },
  {
    id: 'curadoria',
    title: 'Curadoria',
    subtitle: 'DQFB',
    label: 'Módulo Insight',
    description:
      'Conteúdo selecionado e análise macroeconômica diária preparada pelo nosso team editorial.',
    icon: 'auto_awesome',
    iconFilled: true,
    bgColor: 'bg-tertiary-container',
    buttonText: 'Ver Insights',
    buttonTextColor: 'text-tertiary-container',
    url: process.env.NEXT_PUBLIC_MODULE_CURADORIA_URL ?? '#',
  },
];
