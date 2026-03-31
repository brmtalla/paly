import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import pdf from 'npm:pdf-parse/lib/pdf-parse.js';
import mammoth from 'npm:mammoth';
import JSZip from 'npm:jszip';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { uploadId, filePath, fileType } = await req.json();

    if (!uploadId || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing uploadId or filePath' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('uploads')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download file from storage' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buffer = await fileData.arrayBuffer();
    const extension = (fileType || filePath.split('.').pop() || '').toLowerCase();

    let extractedText = '';

    switch (extension) {
      case 'pdf':
        extractedText = await extractPdf(Buffer.from(buffer));
        break;
      case 'docx':
        extractedText = await extractDocx(buffer);
        break;
      case 'doc':
        extractedText = await extractDocx(buffer);
        break;
      case 'pptx':
      case 'ppt':
        extractedText = await extractPptx(buffer);
        break;
      case 'txt':
      case 'md':
        extractedText = new TextDecoder().decode(buffer);
        break;
      default:
        extractedText = new TextDecoder().decode(buffer);
        break;
    }

    extractedText = extractedText.trim();

    if (!extractedText) {
      return new Response(JSON.stringify({ error: 'No text could be extracted from this file' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('uploads')
      .update({ extracted_text: extractedText })
      .eq('id', uploadId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to store extracted text' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        uploadId,
        textLength: extractedText.length,
        preview: extractedText.substring(0, 200),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Extract text error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`DOCX extraction failed: ${error.message}`);
  }
}

async function extractPptx(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const slideTexts: string[] = [];

    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    for (const slidePath of slideFiles) {
      const xml = await zip.files[slidePath].async('text');
      const text = extractTextFromXml(xml);
      if (text.trim()) {
        const slideNum = slidePath.match(/slide(\d+)/)?.[1] || '?';
        slideTexts.push(`[Slide ${slideNum}]\n${text.trim()}`);
      }
    }

    return slideTexts.join('\n\n');
  } catch (error) {
    console.error('PPTX extraction error:', error);
    throw new Error(`PPTX extraction failed: ${error.message}`);
  }
}

function extractTextFromXml(xml: string): string {
  const paragraphs = xml.split(/<\/a:p>/);
  let result = '';

  for (const para of paragraphs) {
    const paraTagRegex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let paraText = '';
    let paraMatch;
    while ((paraMatch = paraTagRegex.exec(para)) !== null) {
      paraText += paraMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }
    if (paraText.trim()) {
      result += paraText.trim() + '\n';
    }
  }

  return result;
}
