//! Embedding service (Commit 5).
//!
//! Provides the Embedder trait and a StubEmbedder for testing/offline use.
//! In a real scenario, this would be backed by `ort` (ONNX Runtime) or similar.

use std::path::Path;

pub trait Embedder: Send + Sync {
    /// Embeds a string of text into a vector of floats.
    fn embed_text(&self, text: &str) -> Vec<f32>;

    /// Embeds an image file into a vector of floats.
    fn embed_image(&self, path: &Path) -> Vec<f32>;
}

/// A stub embedder that generates a deterministic pseudo-embedding using a hash.
/// Useful for testing without downloading ONNX models.
pub struct StubEmbedder;

impl Embedder for StubEmbedder {
    fn embed_text(&self, text: &str) -> Vec<f32> {
        let mut vec = vec![0.0; 384];
        let mut hash = 5381u32;
        for (i, b) in text.bytes().enumerate() {
            hash = ((hash << 5).wrapping_add(hash)).wrapping_add(b as u32);
            vec[i % 384] += (b as f32) / 255.0;
        }
        
        let norm: f32 = vec.iter().map(|v| v * v).sum::<f32>().sqrt();
        if norm > 0.0 {
            for v in vec.iter_mut() {
                *v /= norm;
            }
        }
        vec
    }

    fn embed_image(&self, _path: &Path) -> Vec<f32> {
        let mut vec = vec![0.0; 512];
        vec[0] = 1.0;
        vec
    }
}

pub fn to_blob(embedding: &[f32]) -> Vec<u8> {
    let mut blob = Vec::with_capacity(embedding.len() * 4);
    for &f in embedding {
        blob.extend_from_slice(&f.to_le_bytes());
    }
    blob
}
