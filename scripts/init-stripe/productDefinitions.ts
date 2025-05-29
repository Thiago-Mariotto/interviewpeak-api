import { v4 as uuidv4 } from 'uuid';

interface BasicProduct {
  type: 'basic_interview';
  name: string;
  description: string;
  duration: number;
  prices: {
    amount: number;
    quantity: number;
    expiryDays: number;
  }[];
}

interface SpecializedProduct {
  type: 'specialized';
  name: string;
  description: string;
  position: string;
  company: string;
  prices: {
    amount: number;
    quantity: number;
    expiryDays: number;
  }[];
}

interface BasicProductMetadata {
  productType: 'basic_interview';
  duration: string;
  productId?: string;
}

interface SpecializedProductMetadata {
  productType: 'specialized';
  position: string;
  company: string;
  productId?: string;
}

type ProductMetadata = BasicProductMetadata | SpecializedProductMetadata;

type Product = BasicProduct | SpecializedProduct;

export const basicProducts: BasicProduct[] = [
  {
    type: 'basic_interview',
    name: 'Entrevista Básica 15 min',
    description: 'Simulação de entrevista básica com duração de 15 minutos',
    duration: 15,
    prices: [
      { amount: 690, quantity: 1, expiryDays: 30 },
      { amount: 1660, quantity: 3, expiryDays: 30 },
      { amount: 2760, quantity: 5, expiryDays: 45 },
    ],
  },
  {
    type: 'basic_interview',
    name: 'Entrevista Básica 30 min',
    description: 'Simulação de entrevista básica com duração de 30 minutos',
    duration: 30,
    prices: [
      { amount: 990, quantity: 1, expiryDays: 30 },
      { amount: 2380, quantity: 3, expiryDays: 30 },
      { amount: 3960, quantity: 5, expiryDays: 45 },
    ],
  },
];

export const specializedProducts: SpecializedProduct[] = [
  // {
  //   type: 'specialized',
  //   name: 'Entrevista Especializada FAANG',
  //   description: 'Simulação de processo seletivo para empresas de tecnologia de primeira linha (Google, Meta, Apple, etc.)',
  //   position: 'software_engineer',
  //   company: 'faang',
  //   prices: [
  //     { amount: 1490, quantity: 1, expiryDays: 60 },
  //     { amount: 3490, quantity: 3, expiryDays: 90 },
  //   ],
  // },
  // {
  //   type: 'specialized',
  //   name: 'Entrevista Especializada para Startups',
  //   description: 'Simulação de processo seletivo com foco em startups de tecnologia e ambientes ágeis',
  //   position: 'software_engineer',
  //   company: 'startup',
  //   prices: [
  //     { amount: 1090, quantity: 1, expiryDays: 60 },
  //     { amount: 2690, quantity: 3, expiryDays: 90 },
  //   ],
  // },
  {
    type: 'specialized',
    name: 'Entrevista para Desenvolvedor Frontend',
    description:
      'Simulação de entrevista técnica com foco em desenvolvimento frontend (React, Angular, Vue)',
    position: 'frontend_developer',
    company: 'tech',
    prices: [
      { amount: 1290, quantity: 1, expiryDays: 60 },
      { amount: 2890, quantity: 3, expiryDays: 90 },
    ],
  },
  {
    type: 'specialized',
    name: 'Entrevista para Desenvolvedor Backend',
    description:
      'Simulação de entrevista técnica com foco em desenvolvimento backend e arquitetura de sistemas',
    position: 'backend_developer',
    company: 'tech',
    prices: [
      { amount: 1290, quantity: 1, expiryDays: 60 },
      { amount: 2890, quantity: 3, expiryDays: 90 },
    ],
  },
  // {
  //   type: 'specialized',
  //   name: 'Entrevista para DevOps/SRE',
  //   description: 'Simulação de processo seletivo para engenheiros DevOps e Site Reliability Engineers',
  //   position: 'devops_engineer',
  //   company: 'tech',
  //   prices: [
  //     { amount: 1090, quantity: 1, expiryDays: 60 },
  //     { amount: 2690, quantity: 3, expiryDays: 90 },
  //   ],
  // },
  // {
  //   type: 'specialized',
  //   name: 'Entrevista para Cientista de Dados',
  //   description: 'Simulação de processo seletivo para cientistas de dados e machine learning engineers',
  //   position: 'data_scientist',
  //   company: 'tech',
  //   prices: [
  //     { amount: 1090, quantity: 1, expiryDays: 60 },
  //     { amount: 2690, quantity: 3, expiryDays: 90 },
  //   ],
  // },
  // {
  //   type: 'specialized',
  //   name: 'Entrevista para Product Manager',
  //   description: 'Simulação de processo seletivo para gestores de produto em empresas de tecnologia',
  //   position: 'product_manager',
  //   company: 'tech',
  //   prices: [
  //     { amount: 1090, quantity: 1, expiryDays: 60 },
  //     { amount: 2690, quantity: 3, expiryDays: 90 },
  //   ],
  // },
  // {
  //   type: 'specialized',
  //   name: 'Entrevista para Design de UX/UI',
  //   description: 'Simulação de processo seletivo para designers de experiência do usuário e interface',
  //   position: 'ux_designer',
  //   company: 'tech',
  //   prices: [
  //     { amount: 1090, quantity: 1, expiryDays: 60 },
  //     { amount: 2690, quantity: 3, expiryDays: 90 },
  //   ],
  // },
  // {
  //   type: 'specialized',
  //   name: 'Entrevista para Tech Lead',
  //   description: 'Simulação de processo seletivo para líderes técnicos e engenheiros seniors',
  //   position: 'tech_lead',
  //   company: 'tech',
  //   prices: [
  //     { amount: 1090, quantity: 1, expiryDays: 60 },
  //     { amount: 2690, quantity: 3, expiryDays: 90 },
  //   ],
  // },
  // {
  //   type: 'specialized',
  //   name: 'Entrevista para Empresas Financeiras',
  //   description: 'Simulação de processo seletivo para desenvolvedores em instituições financeiras e fintechs',
  //   position: 'software_engineer',
  //   company: 'finance',
  //   prices: [
  //     { amount: 1090, quantity: 1, expiryDays: 60 },
  //     { amount: 2690, quantity: 3, expiryDays: 90 },
  //   ],
  // }
];

export const allProducts: Product[] = [...basicProducts, ...specializedProducts];

export function getProductMetadata(product: Product): ProductMetadata {
  if (product.type === 'basic_interview') {
    return {
      productType: product.type,
      duration: product.duration.toString(),
    };
  } else {
    return {
      productType: product.type,
      position: product.position,
      company: product.company,
    };
  }
}

export function generateId() {
  return uuidv4();
}
