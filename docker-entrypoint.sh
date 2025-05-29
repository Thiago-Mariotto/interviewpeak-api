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
