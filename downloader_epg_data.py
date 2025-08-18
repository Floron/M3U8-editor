import requests

url = "http://ru.epg.one/epg.xml.gz"
output_path = "./epg.xml.gz"

response = requests.get(url)
if response.status_code == 200:
    with open(output_path, "wb") as f:
        f.write(response.content)
    print("File downloaded successfully.")
else:
    print(f"Failed to download file. Status code: {response.status_code}")