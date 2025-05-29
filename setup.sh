#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================${NC}"
echo -e "${GREEN}Setup da Plataforma de Simulação de Entrevistas${NC}"
echo -e "${YELLOW}============================================${NC}"

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Erro: Docker não está instalado${NC}"
    exit 1
fi

# Verificar se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Aviso: docker-compose não encontrado, tentando docker compose...${NC}"
    
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}Erro: nem docker-compose nem docker compose estão disponíveis${NC}"
        exit 1
    fi
    
    # Se estiver usando docker compose, crie um alias
    alias docker-compose="docker compose"
fi

# Garantir que o diretório prisma existe
mkdir -p prisma

# Verificar se o arquivo schema.prisma existe
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${YELLOW}Arquivo prisma não existe ${NC}"
    echo -e "${RED}Erro: arquivo prisma/schema.prisma não encontrado.${NC}"
    echo -e "${YELLOW}Certifique-se de que o arquivo schema.prisma está no diretório prisma.${NC}"
    exit 1
fi

# Verificar se o arquivo .env existe, senão criar um padrão
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Criando arquivo .env padrão...${NC}"
    # parar com erro
    echo -e "${RED}Erro: arquivo .env não encontrado.${NC}"
    exit 1
fi

# Criar o script de entrypoint
echo -e "${YELLOW}Criando script de entrypoint...${NC}"
cat > docker-entrypoint.sh << 'EOL'
#!/bin/sh
set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${YELLOW}Aguardando banco de dados...${NC}"
sleep 5

echo "${YELLOW}Gerando cliente Prisma...${NC}"
# Forçar a geração do Prisma Client com os targets corretos
npx prisma generate

echo "${YELLOW}Aplicando migrações/push...${NC}"
# Realizar push do schema para o banco (melhor para desenvolvimento)
npx prisma db push --accept-data-loss

echo "${GREEN}Iniciando aplicação...${NC}"
# Executar o comando fornecido
exec "$@"
EOL

# Tornar o script executável
chmod +x docker-entrypoint.sh
echo -e "${GREEN}Script de entrypoint criado e configurado como executável.${NC}"

# Instalar eslint-plugin-promise se não estiver instalado
if ! grep -q "eslint-plugin-promise" package.json; then
    echo -e "${YELLOW}Instalando eslint-plugin-promise...${NC}"
    npm install --save-dev eslint-plugin-promise
fi

echo -e "${GREEN}Parando e removendo serviços anteriores...${NC}"
docker-compose down -v

echo -e "${GREEN}Reconstruindo e iniciando os serviços...${NC}"
docker-compose build --no-cache
docker-compose up -d

echo -e "${GREEN}Serviços iniciados! A API estará disponível em:${NC}"
echo -e "${YELLOW}http://localhost:8000/api/v1${NC}"
echo
echo -e "${GREEN}Visualizando logs (Ctrl+C para sair, os serviços continuarão rodando):${NC}"
docker-compose logs -f