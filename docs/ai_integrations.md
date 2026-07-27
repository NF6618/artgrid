# AI Integrations in ArtGrid

ArtGrid leverages local, privacy-first AI to enhance asset management without compromising your data to cloud APIs. All models run entirely on your local hardware.

## Current Capabilities

### 1. Optical Character Recognition (OCR)
- **Tool**: `tesseract.js`
- **Location**: PDF Viewer
- **Functionality**: Capable of reading flattened image-based PDFs or specific cropped regions of a PDF page. The extracted text is automatically formatted and saved into your library as a new Markdown asset.

### 2. Background Removal
- **Tool**: `@imgly/background-removal`
- **Location**: Image Viewer (Settings > Advanced Features to enable)
- **Functionality**: Uses a WebAssembly-compiled model to instantly mask and cut out subjects from complex backgrounds, rendering the background transparent.

### 3. Image Upscaling
- **Tool**: `upscaler` + `@tensorflow/tfjs`
- **Location**: Image Viewer (Settings > Advanced Features to enable)
- **Functionality**: Utilizes an ESRGAN (Enhanced Super-Resolution Generative Adversarial Network) model via TensorFlow.js to accurately double (2x) the resolution of an image, hallucinating lost details instead of merely blurring pixels.

## Model Downloading
By default, the AI models are downloaded to the browser's persistent cache upon their first invocation. 
To disable these downloads or restrict network usage entirely, users can toggle "Enable AI Models" in the app's Settings menu.

## Future Plans
- **Semantic Search**: Using local vector embeddings to search your image library based on visual content (e.g., searching "sunset over mountains" and returning relevant un-tagged images).
- **Auto-Tagging**: Generating rich metadata for new imports automatically.
