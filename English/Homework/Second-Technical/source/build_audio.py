import asyncio, json
from pathlib import Path
import edge_tts

root = Path(__file__).resolve().parent.parent
scripts = json.loads((root / "source/listening.json").read_text(encoding="utf-8"))
limit = asyncio.Semaphore(4)

async def render(slug, script):
    async with limit:
        for attempt in range(3):
            try:
                await edge_tts.Communicate(script, "en-US-AvaNeural", rate="-12%").save(str(root / "audio" / (slug + ".mp3")))
                return
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(attempt + 1)

async def main():
    await asyncio.gather(*(render(slug, script) for slug, script in scripts.items()))
    print(f"Built {len(scripts)} listening tracks.")

if __name__ == "__main__":
    asyncio.run(main())
