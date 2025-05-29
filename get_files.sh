#!/bin/bash

# Uso: ./copy_files.sh [diretório_origem] [diretório_destino]

# Verifica se foram passados os argumentos necessários
if [ $# -ne 2 ]; then
    echo "Uso: $0 [diretório_origem] [diretório_destino]"
    exit 1
fi

SOURCE_DIR="$1"
DEST_DIR="$2"

# Verifica se o diretório de origem existe
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Erro: Diretório de origem '$SOURCE_DIR' não existe!"
    exit 1
fi

# Cria o diretório de destino se não existir
mkdir -p "$DEST_DIR"

# Função para copiar arquivos
copy_files() {
    local current_dir="$1"
    
    # Encontra todos os arquivos recursivamente, excluindo pastas node_modules e dist
    find "$current_dir" -type f -not -path "*/node_modules/*" -not -path "*/dist/*" | while read -r file; do
        # Obtém o nome do arquivo sem o caminho completo
        filename=$(basename "$file")
        
        # Verifica se o arquivo já existe no destino
        if [ -f "$DEST_DIR/$filename" ]; then
            # Cria um nome único adicionando um timestamp
            new_filename="${filename%.*}_$(date +%Y%m%d%H%M%S).${filename##*.}"
            echo "Arquivo '$filename' já existe. Copiando como '$new_filename'"
            cp "$file" "$DEST_DIR/$new_filename"
        else
            echo "Copiando '$file' para '$DEST_DIR/$filename'"
            cp "$file" "$DEST_DIR/$filename"
        fi
    done
}

# Inicia o processo de cópia
echo "Iniciando cópia de arquivos de '$SOURCE_DIR' para '$DEST_DIR', ignorando node_modules e dist..."
copy_files "$SOURCE_DIR"
echo "Processo de cópia concluído!"