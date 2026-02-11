import os
import json

# --- CONFIGURAÇÕES ---
pasta_arquivos = 'arquivos'
arquivo_json = 'dados.json'

print("--- INICIANDO CORREÇÃO DO UNIREPO ---")

# 1. Verifica se a pasta existe
if not os.path.exists(pasta_arquivos):
    print(f"ERRO CRÍTICO: A pasta '{pasta_arquivos}' não existe!")
    input("Pressione Enter para sair...")
    exit()

lista_provas = []
arquivos = os.listdir(pasta_arquivos)
arquivos_encontrados = 0

print(f"Lendo pasta '{pasta_arquivos}'...")

for arquivo in arquivos:
    # Ignora arquivos que não são PDF
    if not arquivo.lower().endswith('.pdf'):
        continue

    arquivos_encontrados += 1
    
    # Remove a extensão .pdf para analisar
    nome_sem_extensao = os.path.splitext(arquivo)[0]
    partes = nome_sem_extensao.split('_')

    # Validação rigorosa do nome
    if len(partes) < 4:
        print(f"❌ ERRO NO NOME: '{arquivo}'")
        print(f"   -> O nome precisa ter 4 partes separadas por underline (_).")
        print(f"   -> Exemplo correto: Materia_Professor_Prova_Ano.pdf")
        continue # Pula para o próximo arquivo

    # Se chegou aqui, o nome está certo
    materia = partes[0].replace('-', ' ')
    professor = partes[1].replace('-', ' ')
    tipo = partes[2].replace('-', ' ')
    ano = partes[3]

    prova = {
        "materia": materia,
        "professor": professor,
        "tipo": tipo,
        "ano": ano,
        "arquivo": f"{pasta_arquivos}/{arquivo}"
    }
    
    lista_provas.append(prova)
    print(f"✅ SUCESSO: {materia} ({tipo}) adicionada.")

# 2. Salva o novo JSON (Isso apaga as provas fantasmas antigas)
with open(arquivo_json, 'w', encoding='utf-8') as f:
    json.dump(lista_provas, f, indent=4, ensure_ascii=False)

print("\n" + "="*40)
print(f"RESUMO FINAL:")
print(f"- Arquivos PDF na pasta: {arquivos_encontrados}")
print(f"- Provas cadastradas no site: {len(lista_provas)}")
print("="*40)

if len(lista_provas) == 0 and arquivos_encontrados > 0:
    print("⚠️  AVISO: Nenhum PDF foi aceito. Verifique os nomes dos arquivos (use _ para separar).")

print("\nAgora atualize a página do site (Ctrl + F5).")
input("Pressione Enter para fechar...")