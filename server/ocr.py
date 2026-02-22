"""PaddleOCR wrapper for text extraction from images."""

import base64
import io
from paddleocr import PaddleOCR


class OCRProcessor:
    """Wrapper around PaddleOCR for image text extraction."""

    def __init__(self, lang: str = "en", use_gpu: bool = False):
        """
        Initialize the OCR processor.

        Args:
            lang: Language code for OCR (default: 'en' for English)
            use_gpu: Whether to use GPU acceleration (default: False)
        """
        self.ocr = PaddleOCR(
            use_angle_cls=True,
            lang=lang,
            use_gpu=use_gpu,
            show_log=False,
        )

    def process_base64_image(self, image_base64: str) -> str:
        """
        Process a base64-encoded image and extract text.

        Args:
            image_base64: Base64-encoded image string

        Returns:
            Extracted text from the image
        """
        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image_bytes = io.BytesIO(image_data)

        # Run OCR
        result = self.ocr.ocr(image_bytes, cls=True)

        # Extract text from results
        texts = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text = line[1][0]  # text is at index [1][0]
                    confidence = line[1][1]  # confidence is at index [1][1]
                    if confidence > 0.5:  # Filter low-confidence results
                        texts.append(text)

        return " ".join(texts)

    def process_image_bytes(self, image_bytes: bytes) -> str:
        """
        Process raw image bytes and extract text.

        Args:
            image_bytes: Raw image bytes

        Returns:
            Extracted text from the image
        """
        result = self.ocr.ocr(image_bytes, cls=True)

        texts = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text = line[1][0]
                    confidence = line[1][1]
                    if confidence > 0.5:
                        texts.append(text)

        return " ".join(texts)


# Global instance for reuse
_ocr_processor: OCRProcessor | None = None


def get_ocr_processor() -> OCRProcessor:
    """Get or create the global OCR processor instance."""
    global _ocr_processor
    if _ocr_processor is None:
        _ocr_processor = OCRProcessor()
    return _ocr_processor
