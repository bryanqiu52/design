import asyncio
import sys
import os
import requests
from pathlib import Path

# 添加技能脚本路径
sys.path.append("/data/user/skills/byted-seedream-image-generate/scripts")
from seedream_image_generate import seedream_generate

async def download_image(url, save_path):
    """下载图片到本地"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            f.write(response.content)
        print(f"✓ 图片已保存: {save_path}")
        return True
    except Exception as e:
        print(f"✗ 下载图片失败: {e}")
        return False

async def main():
    # 确保 images 目录存在
    images_dir = Path("/workspace/images")
    images_dir.mkdir(exist_ok=True)
    
    # 定义需要生成的图片
    image_requests = [
        {
            "name": "designer_portrait",
            "prompt": "professional portrait of a creative designer, 30s Asian man, stylish haircut, wearing minimalist black shirt, modern studio background, dramatic lighting, high quality photography, 4k, cinematic",
            "size": "1536x2048"
        },
        {
            "name": "coffee_lifestyle",
            "prompt": "artisan coffee brewing setup, pour-over coffee, morning light, minimalist aesthetic, warm tones, lifestyle photography, high quality",
            "size": "2048x2048"
        },
        {
            "name": "gaming_lifestyle",
            "prompt": "modern gaming setup, RGB lighting, minimalist desk setup, clean aesthetic, dark mood, gaming controller, high quality photography",
            "size": "2048x2048"
        },
        {
            "name": "photography_lifestyle",
            "prompt": "vintage film camera on wooden table, soft natural light, photography accessories, creative workspace, warm aesthetic, lifestyle photography",
            "size": "2048x2048"
        },
        {
            "name": "music_lifestyle",
            "prompt": "vinyl records and headphones, warm moody lighting, music production workspace, minimalist design, creative atmosphere, high quality",
            "size": "2048x2048"
        }
    ]
    
    generated_images = []
    
    print("开始生成图片...")
    for idx, req in enumerate(image_requests, 1):
        print(f"\n[{idx}/{len(image_requests)}] 生成: {req['name']}")
        
        try:
            # 调用图片生成 API
            result = await seedream_generate([
                {
                    "prompt": req["prompt"],
                    "size": req["size"],
                    "watermark": False
                }
            ], version="5.0")
            
            if result and len(result) > 0:
                image_url = result[0].get("url")
                if image_url:
                    print(f"✓ 生成成功: {image_url}")
                    
                    # 下载图片
                    save_path = images_dir / f"{req['name']}.jpg"
                    success = await download_image(image_url, save_path)
                    if success:
                        generated_images.append({
                            "name": req["name"],
                            "path": str(save_path),
                            "url": image_url
                        })
                else:
                    print("✗ 未获取到图片 URL")
            else:
                print("✗ 生成失败")
                
        except Exception as e:
            print(f"✗ 生成出错: {e}")
    
    print(f"\n✓ 完成! 共生成 {len(generated_images)} 张图片")
    return generated_images

if __name__ == "__main__":
    asyncio.run(main())
