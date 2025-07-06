#!/usr/bin/env python3
"""
Utilitário para gerenciar metadados dos documentos

Funcionalidades:
- Sincronizar metadados com arquivos existentes
- Gerar resumos para documentos sem resumo
- Backup e restauração de metadados
- Limpeza de metadados órfãos
"""

import os
import json
import sys
import shutil
from datetime import datetime
from pathlib import Path

# Configurações
UPLOAD_DIR = "uploads"
METADATA_FILE = "document_metadata.json"
BACKUP_DIR = "metadata_backups"

def load_metadata():
    """Carrega metadados do arquivo JSON"""
    try:
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Erro ao carregar metadados: {e}")
        return {}

def save_metadata(metadata):
    """Salva metadados no arquivo JSON"""
    try:
        with open(METADATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2, default=str)
        print(f"Metadados salvos: {len(metadata)} documentos")
        return True
    except Exception as e:
        print(f"Erro ao salvar metadados: {e}")
        return False

def backup_metadata():
    """Cria backup dos metadados"""
    if not os.path.exists(METADATA_FILE):
        print("Nenhum arquivo de metadados para fazer backup")
        return False
    
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(BACKUP_DIR, f"metadata_backup_{timestamp}.json")
    
    try:
        shutil.copy2(METADATA_FILE, backup_file)
        print(f"Backup criado: {backup_file}")
        return True
    except Exception as e:
        print(f"Erro ao criar backup: {e}")
        return False

def sync_with_files():
    """Sincroniza metadados com arquivos existentes"""
    print("Sincronizando metadados com arquivos...")
    
    if not os.path.exists(UPLOAD_DIR):
        print(f"Pasta {UPLOAD_DIR} não encontrada")
        return False
    
    metadata = load_metadata()
    existing_files = set()
    new_files = 0
    
    # Verifica arquivos existentes
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith('.pdf'):
            existing_files.add(filename)
            
            # Se arquivo existe mas não tem metadados, cria entrada básica
            if filename not in metadata:
                file_path = os.path.join(UPLOAD_DIR, filename)
                stat = os.stat(file_path)
                
                original_name = filename
                if '_' in filename:
                    parts = filename.split('_')
                    if len(parts) > 2:
                        original_name = '_'.join(parts[2:])
                
                metadata[filename] = {
                    'original_name': original_name,
                    'summary': 'Resumo não disponível - sincronizado automaticamente',
                    'upload_date': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    'file_size': stat.st_size,
                    'sync_date': datetime.now().isoformat()
                }
                new_files += 1
                print(f"Adicionado: {original_name}")
    
    # Remove metadados órfãos
    files_to_remove = []
    for filename in metadata.keys():
        if filename not in existing_files:
            files_to_remove.append(filename)
    
    for filename in files_to_remove:
        original_name = metadata[filename].get('original_name', filename)
        del metadata[filename]
        print(f"Removido metadado órfão: {original_name}")
    
    # Salva alterações
    if new_files > 0 or files_to_remove:
        save_metadata(metadata)
        print(f"Sincronização concluída: {new_files} adicionados, {len(files_to_remove)} removidos")
    else:
        print("Metadados já estão sincronizados")
    
    return True

def list_documents():
    """Lista todos os documentos com seus metadados"""
    metadata = load_metadata()
    
    if not metadata:
        print("Nenhum documento encontrado")
        return
    
    print(f"\n=== DOCUMENTOS CADASTRADOS ({len(metadata)}) ===")
    for i, (filename, data) in enumerate(metadata.items(), 1):
        print(f"\n{i}. {data.get('original_name', filename)}")
        print(f"   ID: {filename}")
        print(f"   Tamanho: {data.get('file_size', 0):,} bytes")
        print(f"   Upload: {data.get('upload_date', 'N/A')}")
        print(f"   Resumo: {'✓' if data.get('summary') and 'não disponível' not in data.get('summary', '').lower() else '✗'}")

def generate_missing_summaries():
    """Placeholder para gerar resumos em documentos que não têm"""
    metadata = load_metadata()
    missing_summaries = []
    
    for filename, data in metadata.items():
        summary = data.get('summary', '')
        if not summary or 'não disponível' in summary.lower():
            missing_summaries.append(filename)
    
    if not missing_summaries:
        print("Todos os documentos já têm resumos")
        return
    
    print(f"Encontrados {len(missing_summaries)} documentos sem resumo:")
    for filename in missing_summaries:
        original_name = metadata[filename].get('original_name', filename)
        print(f"  - {original_name}")
    
    print("\nPara gerar resumos, execute o processamento completo via API admin/upload")

def clean_metadata():
    """Remove metadados de arquivos que não existem mais"""
    print("Limpando metadados órfãos...")
    metadata = load_metadata()
    
    if not os.path.exists(UPLOAD_DIR):
        print(f"Pasta {UPLOAD_DIR} não encontrada")
        return False
    
    existing_files = set()
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith('.pdf'):
            existing_files.add(filename)
    
    files_to_remove = []
    for filename in metadata.keys():
        if filename not in existing_files:
            files_to_remove.append(filename)
    
    if not files_to_remove:
        print("Nenhum metadado órfão encontrado")
        return True
    
    for filename in files_to_remove:
        original_name = metadata[filename].get('original_name', filename)
        del metadata[filename]
        print(f"Removido: {original_name}")
    
    save_metadata(metadata)
    print(f"Limpeza concluída: {len(files_to_remove)} metadados órfãos removidos")
    return True

def show_help():
    """Mostra ajuda do comando"""
    print("""
Gerenciador de Metadados de Documentos

Uso: python manage_metadata.py [comando]

Comandos disponíveis:
  sync      - Sincroniza metadados com arquivos existentes
  list      - Lista todos os documentos cadastrados
  clean     - Remove metadados órfãos
  backup    - Cria backup dos metadados
  summaries - Mostra documentos sem resumo
  help      - Mostra esta ajuda

Exemplos:
  python manage_metadata.py sync
  python manage_metadata.py list
  python manage_metadata.py backup
    """)

def main():
    """Função principal"""
    if len(sys.argv) < 2:
        show_help()
        return
    
    command = sys.argv[1].lower()
    
    if command == 'sync':
        sync_with_files()
    elif command == 'list':
        list_documents()
    elif command == 'clean':
        clean_metadata()
    elif command == 'backup':
        backup_metadata()
    elif command == 'summaries':
        generate_missing_summaries()
    elif command == 'help':
        show_help()
    else:
        print(f"Comando desconhecido: {command}")
        show_help()

if __name__ == "__main__":
    main()