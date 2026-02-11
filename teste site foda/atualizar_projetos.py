import os
import json

# Configurações
pasta_projetos = 'projetos'
arquivo_json = 'projetos.json'

print("--- AUTOMATIZAÇÃO DE PROJETOS (Gabarita.ai) ---")

if not os.path.exists(pasta_projetos):
    os.makedirs(pasta_projetos)

lista_projetos = []

# Verifica se a pasta tem arquivos
if os.path.exists(pasta_projetos):
    arquivos = os.listdir(pasta_projetos)
    for arquivo in arquivos:
        if not arquivo.lower().endswith('.pdf'):
            continue

        # Padrão: Titulo_Autor_Tags.pdf
        nome_sem_extensao = os.path.splitext(arquivo)[0]
        partes = nome_sem_extensao.split('_')

        if len(partes) >= 3:
            titulo = partes[0].replace('-', ' ')
            autor = partes[1].replace('-', ' ')
            tags = partes[2].replace('-', ' ')
            
            projeto = {
                "titulo": titulo,
                "autor": autor,
                "tags": tags,
                "arquivo": f"{pasta_projetos}/{arquivo}"
            }
            lista_projetos.append(projeto)
            print(f"[OK] Projeto: {titulo}")
        else:
            print(f"[!] Ignorado: {arquivo} (Use: Titulo_Autor_Tags.pdf)")

# Salva o JSON
with open(arquivo_json, 'w', encoding='utf-8') as f:
    json.dump(lista_projetos, f, indent=4, ensure_ascii=False)

print(f"Sucesso! {len(lista_projetos)} projetos catalogados.")
input("Pressione Enter para sair...")