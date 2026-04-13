import { useState, useEffect } from 'react'
import FileViewer from './components/FileViewer'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [customFiles, setCustomFiles] = useState([])
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const sampleFiles = [
    { fileType: 'text', extension: 'txt' },
    { fileType: 'html', extension: 'html' },
    { fileType: 'json', extension: 'json' },
    { fileType: 'xml', extension: 'xml' },
    { fileType: 'gif', extension: 'gif' },
    { fileType: 'jpeg', extension: 'jpg' },
    { fileType: 'webp', extension: 'webp' },
    { fileType: 'png', extension: 'png' },
  ]

  useEffect(() => {
    fetchCustomFiles()
  }, [])

  const fetchCustomFiles = async () => {
    const res = await fetch('/api/custom/files')
    const files = await res.json()
    setCustomFiles(files)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', uploadFile)
    
    await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    setUploadFile(null)
    setUploading(false)
    fetchCustomFiles()
  }

  return (
    <div className="min-vh-100 bg-dark">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="text-center mb-5">
              <h1 className="display-4 fw-bold text-light mb-2">MIME Type Viewer</h1>
              <p className="lead text-secondary">Click a file extension to preview</p>
            </div>
            
            <div className="mb-5">
              <h4 className="text-light mb-3">Sample Files</h4>
              <div className="d-flex flex-wrap justify-content-center gap-3">
                {sampleFiles.map(file => (
                  <button
                    key={file.fileType}
                    onClick={() => setSelectedFile(file)}
                    className="btn btn-outline-light btn-lg px-4"
                  >
                    {file.extension.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <h4 className="text-light mb-3">Upload Files</h4>
              <form onSubmit={handleUpload} className="d-flex gap-2 justify-content-center">
                <input
                  type="file"
                  className="form-control w-auto"
                  style={{ maxWidth: '300px' }}
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
                <button type="submit" className="btn btn-primary" disabled={!uploadFile || uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </form>
            </div>

            {customFiles.length > 0 && (
              <div className="mb-5">
                <h4 className="text-light mb-3">Custom Files</h4>
                <div className="d-flex flex-wrap justify-content-center gap-2">
                  {customFiles.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFile({ filename: file.filename, extension: file.extension })}
                      className="btn btn-outline-info"
                    >
                      {file.filename}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedFile && (
        <FileViewer
          fileInfo={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  )
}

export default App