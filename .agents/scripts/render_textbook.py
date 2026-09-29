import fitz
from pathlib import Path

source = Path("attached_assets/0_Grade_1_Math_Example_Book_1790696657792.pdf")
output = Path(".agents/outputs/textbook")
output.mkdir(parents=True, exist_ok=True)
document = fitz.open(source)
print("pages:", document.page_count, "metadata:", document.metadata)
for index, page in enumerate(document):
    image = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    image.save(output / f"page-{index + 1:02}.png")
    print(f"\n===== PDF page {index + 1} =====\n{page.get_text()}")