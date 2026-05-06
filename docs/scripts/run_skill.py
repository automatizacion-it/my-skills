"""
run_skill.py — Invoca una skill leyendo su SKILL.md e inyectándola como system prompt.

Uso:
    python scripts/run_skill.py --skill redactar-email --input "Tu tarea aquí"

O desde código:
    from scripts.run_skill import run_skill
    resultado = run_skill("redactar-email", "Escribe un email a Juan sobre la reunión del lunes")
"""

import os
import argparse
from pathlib import Path
import anthropic

# Directorio raíz del repositorio (un nivel arriba de /scripts)
REPO_ROOT = Path(__file__).parent.parent
SKILLS_DIR = REPO_ROOT / "skills"


def load_skill(skill_name: str) -> str:
    """Lee el SKILL.md de la skill indicada y lo retorna como string."""
    skill_path = SKILLS_DIR / skill_name / "SKILL.md"
    if not skill_path.exists():
        available = [d.name for d in SKILLS_DIR.iterdir() if d.is_dir()]
        raise FileNotFoundError(
            f"Skill '{skill_name}' no encontrada.\n"
            f"Skills disponibles: {', '.join(available)}"
        )
    return skill_path.read_text(encoding="utf-8")


def run_skill(skill_name: str, user_input: str, model: str = "claude-sonnet-4-20250514") -> str:
    """
    Ejecuta una skill con el input del usuario.

    Args:
        skill_name: Nombre de la carpeta de la skill (ej: 'redactar-email')
        user_input: La tarea o instrucción del usuario
        model: Modelo de Claude a usar

    Returns:
        Respuesta de Claude como string
    """
    skill_content = load_skill(skill_name)

    system_prompt = f"""Eres un asistente experto. Antes de responder, aplica estrictamente
las instrucciones de la siguiente skill:

---
{skill_content}
---

Sigue todas las instrucciones, restricciones y formato de output definidos en la skill.
"""

    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_input}
        ]
    )

    return message.content[0].text


def main():
    parser = argparse.ArgumentParser(description="Ejecuta una skill de Claude")
    parser.add_argument("--skill", required=True, help="Nombre de la skill (ej: redactar-email)")
    parser.add_argument("--input", required=True, help="Input o tarea para la skill")
    parser.add_argument("--model", default="claude-sonnet-4-20250514", help="Modelo de Claude")
    args = parser.parse_args()

    print(f"\n🔧 Ejecutando skill: {args.skill}\n{'─'*40}")
    resultado = run_skill(args.skill, args.input, args.model)
    print(resultado)


if __name__ == "__main__":
    main()
