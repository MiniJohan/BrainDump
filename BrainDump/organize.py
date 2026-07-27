import re

def organize(raw_text):
    items = re.split(r'[,;\n]+', raw_text)
    items = [item.strip() for item in items]
    items = [re.sub(r'^[-•*–]\s*', '', item) for item in items]
    items = [item for item in items if item]
    return items