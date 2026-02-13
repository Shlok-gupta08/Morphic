import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';

// Tool pages
import DocumentConverter from '@/pages/tools/DocumentConverter';
import ImageConverter from '@/pages/tools/ImageConverter';
import MergePdf from '@/pages/tools/MergePdf';
import SplitPdf from '@/pages/tools/SplitPdf';
import RotatePdf from '@/pages/tools/RotatePdf';
import ExtractPages from '@/pages/tools/ExtractPages';
import RemovePages from '@/pages/tools/RemovePages';
import PageNumbers from '@/pages/tools/PageNumbers';
import CompressFile from '@/pages/tools/CompressFile';
import AddPassword from '@/pages/tools/AddPassword';
import RemovePassword from '@/pages/tools/RemovePassword';
import Watermark from '@/pages/tools/Watermark';
import RepairPdf from '@/pages/tools/RepairPdf';
import FlattenPdf from '@/pages/tools/FlattenPdf';
import OcrTool from '@/pages/tools/OcrTool';
import FileInfo from '@/pages/tools/FileInfo';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />

        {/* Convert */}
        <Route path="/tools/document-converter" element={<DocumentConverter />} />
        <Route path="/tools/image-converter" element={<ImageConverter />} />

        {/* Organize */}
        <Route path="/tools/merge" element={<MergePdf />} />
        <Route path="/tools/split" element={<SplitPdf />} />
        <Route path="/tools/rotate" element={<RotatePdf />} />
        <Route path="/tools/extract-pages" element={<ExtractPages />} />
        <Route path="/tools/remove-pages" element={<RemovePages />} />
        <Route path="/tools/page-numbers" element={<PageNumbers />} />

        {/* Security */}
        <Route path="/tools/add-password" element={<AddPassword />} />
        <Route path="/tools/remove-password" element={<RemovePassword />} />
        <Route path="/tools/watermark" element={<Watermark />} />

        {/* Tools */}
        <Route path="/tools/compress" element={<CompressFile />} />
        <Route path="/tools/repair" element={<RepairPdf />} />
        <Route path="/tools/flatten" element={<FlattenPdf />} />
        <Route path="/tools/ocr" element={<OcrTool />} />
        {/* Updated Route */}
        <Route path="/tools/metadata" element={<FileInfo />} />
      </Route>
    </Routes>
  );
}
