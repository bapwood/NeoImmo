#!/usr/bin/env python3
"""
Vide entièrement la base NeoImmo et ne laisse qu'un unique compte admin.

Toutes les tables métier sont TRUNCATE (CASCADE, RESTART IDENTITY : les
identifiants repartent à 1), puis un compte admin est recréé :

  email : admin@neoimmo.local
  mdp   : admin

Utilise `docker exec` vers le conteneur postgres du docker-compose du projet
(pas de connexion réseau directe requise).

Dépendances : pip install -r requirements.txt (depuis la racine du repo)

Usage:
  python3 vide_db.py
  DB_CONTAINER=postgres DB_USER=postgres DB_NAME=neoimmo python3 vide_db.py
"""

import os
import subprocess
import sys
import bcrypt

DB_CONTAINER = os.getenv("DB_CONTAINER", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_NAME = os.getenv("DB_NAME", "neoimmo")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@neoimmo.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")

TABLES_TO_TRUNCATE = [
    "BlockchainOperation",
    "PortfolioRevenue",
    "PortfolioPosition",
    "_KeyPointToProperty",
    "KeyPoint",
    "Property",
    "RefreshToken",
    "User",
]


def run_sql(sql):
    result = subprocess.run(
        ["docker", "exec", "-i", DB_CONTAINER, "psql", "-U", DB_USER, "-d", DB_NAME, "-v", "ON_ERROR_STOP=1"],
        input=sql,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("Échec de la requête SQL :")
        print(result.stdout)
        print(result.stderr)
        sys.exit(1)
    return result.stdout


def sql_escape(value):
    return value.replace("'", "''")


def confirm():
    if "--yes" in sys.argv or "-y" in sys.argv:
        return
    if not sys.stdin.isatty():
        print("Utilise --yes pour confirmer en mode non-interactif.")
        sys.exit(1)
    answer = input(
        f"⚠️  Ceci va vider TOUTES les données de la base '{DB_NAME}' (conteneur {DB_CONTAINER}) "
        "et ne laisser qu'un compte admin. Continuer ? [y/N] "
    )
    if answer.strip().lower() not in ("y", "yes", "o", "oui"):
        print("Annulé.")
        sys.exit(0)


def main():
    confirm()

    password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt(10)).decode()

    quoted_tables = ", ".join(f'"{table}"' for table in TABLES_TO_TRUNCATE)
    truncate_sql = f"TRUNCATE TABLE {quoted_tables} RESTART IDENTITY CASCADE;"

    print(f"Vidage de la base {DB_NAME} (conteneur {DB_CONTAINER})...")
    run_sql(truncate_sql)
    print("Toutes les tables métier ont été vidées.")

    insert_sql = (
        'INSERT INTO "User" (email, password, role) '
        f"VALUES ('{sql_escape(ADMIN_EMAIL)}', '{sql_escape(password_hash)}', 'ADMIN'::\"Role\");"
    )
    run_sql(insert_sql)

    print(f"Compte admin recréé : {ADMIN_EMAIL} / {ADMIN_PASSWORD}")


if __name__ == '__main__':
    main()
