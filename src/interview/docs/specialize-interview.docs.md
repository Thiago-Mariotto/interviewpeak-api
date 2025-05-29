# Guia de Implementação: Sistema de Entrevistas Especializadas

Este documento explica a nova arquitetura modular para o sistema de entrevistas e como adicionar novos tipos de entrevistas especializadas.

## 1. Estrutura Geral

A nova arquitetura é baseada no padrão Provider e Registry:

- **IPromptProvider** - Interface que define os métodos que todos os providers devem implementar
- **BasePromptProvider** - Implementação base com a lógica comum para todos os tipos de entrevista
- **Providers Especializados** (ex: BackendDeveloperPromptProvider) - Implementações específicas para cada tipo de entrevista especializada
- **PromptProviderRegistry** - Registro central que gerencia e fornece o provider adequado para cada configuração

## 2. Como Funciona

1. O sistema registra todos os providers disponíveis durante a inicialização
2. Quando uma entrevista é solicitada, o InterviewEngineService requisita o provider adequado ao registry
3. O registry seleciona o provider correto baseado nas configurações da entrevista
4. O provider gera os prompts de sistema e feedback específicos para aquele tipo de entrevista

## 3. Como Adicionar uma Nova Entrevista Especializada

### Passo 1: Atualizar o DTO

Em `interview.dto.ts`, adicione o novo tipo à enum `SpecializedInterviewType`:

```typescript
export enum SpecializedInterviewType {
  UX_UI_DESIGNER = 'ux_ui_designer',
  DATA_SCIENTIST = 'data_scientist',
  // ... tipos existentes
  MEU_NOVO_TIPO = 'meu_novo_tipo', // Adicione aqui
}
```

### Passo 2: Criar um Provider Especializado

Crie um novo arquivo em `/prompt-providers/specialized/` (exemplo: `meu-novo-tipo-prompt.provider.ts`):

```typescript
import { Injectable } from '@nestjs/common';
import { BasePromptProvider } from '../base-prompt.provider';
import { 
  InterviewSettingsDto, 
  InterviewProductType,
  SpecializedInterviewType,
  Language 
} from '../../../dto/interview.dto';

@Injectable()
export class MeuNovoTipoPromptProvider extends BasePromptProvider {
  canHandle(settings: InterviewSettingsDto): boolean {
    return (
      settings.productType === InterviewProductType.SPECIALIZED &&
      settings.specializedType === SpecializedInterviewType.MEU_NOVO_TIPO
    );
  }

  getSystemPrompt(settings: InterviewSettingsDto): string {
    // Obter o prompt base e modificá-lo ou substituir partes específicas
    const basePrompt = super.getSystemPrompt(settings);
    const especializedInstructions = this.getCustomInstructions(settings.language);
    
    // Lógica para substituir as instruções gerais por especializadas
    // ...
    
    return promptModificado;
  }

  getFeedbackPrompt(settings: InterviewSettingsDto): string {
    // Criar prompt de feedback especializado
    return `
      // Prompt de feedback personalizado
    `;
  }

  private getCustomInstructions(language: string): string {
    // Instruções específicas para este tipo de entrevista
    if (language === Language.PT_BR) {
      return `// Instruções em português`;
    } else {
      return `// Instruções em inglês`;
    }
  }
}
```

### Passo 3: Atualizar as Categorias de Feedback (opcional)

Em `feedback.dto.ts`, adicione as categorias de feedback específicas para o novo tipo:

```typescript
export enum MeuNovoTipoFeedbackCategory {
  CATEGORIA_1 = 'categoria_1',
  CATEGORIA_2 = 'categoria_2',
  // ...
}
```

### Passo 4: Registrar o Provider

Atualize o módulo `prompt-providers.module.ts` para incluir o novo provider:

```typescript
@Module({
  providers: [
    BasePromptProvider,
    BackendDeveloperPromptProvider,
    MeuNovoTipoPromptProvider, // Adicione aqui
    PromptProviderRegistry,
  ],
  exports: [PromptProviderRegistry],
})
export class PromptProvidersModule {
  constructor(
    private readonly registry: PromptProviderRegistry,
    private readonly baseProvider: BasePromptProvider,
    private readonly backendProvider: BackendDeveloperPromptProvider,
    private readonly meuNovoTipoProvider: MeuNovoTipoPromptProvider, // Adicione aqui
  ) {
    this.registry.registerProvider(baseProvider);
    this.registry.registerProvider(backendProvider);
    this.registry.registerProvider(meuNovoTipoProvider); // Registre aqui
  }
}
```

## 4. Boas Práticas Para Prompts Especializados

1. **Pesquise o domínio**: Estude a área específica para garantir que as perguntas sejam relevantes e atuais
2. **Consulte especialistas**: Converse com profissionais da área para entender o que avaliar
3. **Estruture por competências**: Divida o prompt em áreas principais de competência
4. **Defina categorias claras**: Crie categorias de feedback que reflitam as habilidades importantes para a função
5. **Inclua exemplos de perguntas**: Forneça exemplos de perguntas para cada área principal
6. **Pense nos níveis de senioridade**: Adapte as perguntas e expectativas aos diferentes níveis de experiência
7. **Atualize regularmente**: Mantenha os prompts atualizados com as mudanças da indústria

## 5. Testes Práticos

É recomendável fazer testes práticos de cada entrevista especializada antes de disponibilizá-la aos usuários:

1. Configurar uma entrevista com o novo tipo especializado
2. Executar pelo menos 3 entrevistas de teste completas
3. Revisar as perguntas, respostas e feedback para garantir coerência e qualidade
4. Ajustar os prompts conforme necessário com base nos resultados dos testes