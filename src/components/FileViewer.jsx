import { useState, useEffect } from 'react'

const TEXT_TYPES = ['text/plain', 'text/html', 'application/json', 'application/xml', 'text/css', 'application/javascript', 'text/csv', 'text/markdown']
const IMAGE_TYPES = ['image/gif', 'image/jpeg', 'image/webp', 'image/png']

export default function FileViewer({ fileInfo, onClose }) {
  const { filename, extension } = fileInfo
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        if (filename) {
          const res = await fetch(`/api/file/content?filename=${filename}`)
          if (!res.ok) {
            setError('File not found')
            setLoading(false)
            return
          }
          
          const contentType = res.headers.get('content-type') || 'application/octet-stream'
          const isJson = contentType.includes('application/json')
          
          if (isJson) {
            const json = await res.json()
            if (json.content !== undefined) {
              // Text content returned as JSON
              setData({ type: 'text', mimeType: json.mimeType, content: json.content, size: new Blob([json.content]).size, filename })
            } else {
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              setData({ type: 'download', mimeType: blob.type, content: url, size: blob.size, filename })
            }
          } else if (IMAGE_TYPES.includes(contentType)) {
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            setData({ type: 'image', mimeType: contentType, content: url, size: blob.size, filename })
          } else if (TEXT_TYPES.some(t => contentType.startsWith(t))) {
            const text = await res.text()
            setData({ type: 'text', mimeType: contentType, content: text, size: new Blob([text]).size })
          } else {
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            setData({ type: 'download', mimeType: contentType, content: url, size: blob.size })
          }
        } else {
          const res = await fetch(`/api/file?type=${fileInfo.fileType}`)
          if (!res.ok) throw new Error('Failed to fetch file info')
          const fileInfoData = await res.json()
          const { mimeType, filename: serverFilename, data: content } = fileInfoData
          
          if (IMAGE_TYPES.includes(mimeType) && serverFilename) {
            const res2 = await fetch(`/api/file/content?filename=${serverFilename}`)
            const blob = await res2.blob()
            const url = URL.createObjectURL(blob)
            setData({ type: 'image', mimeType, content: url, size: blob.size, filename: serverFilename })
          } else if (TEXT_TYPES.includes(mimeType)) {
            const byteSize = new Blob([content]).size
            setData({ type: 'text', mimeType, content, size: byteSize, filename: serverFilename })
          } else {
            const byteSize = new Blob([content]).size
            setData({ type: 'download', mimeType, content, size: byteSize, filename: serverFilename })
          }
        }
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    fetchContent()
  }, [fileInfo])

  const handleDownload = () => {
    const downloadFilename = data?.filename || filename || `file.${extension}`
    if (data?.content?.startsWith('blob:')) {
      const a = document.createElement('a')
      a.href = data.content
      a.download = downloadFilename
      a.click()
    } else {
      const blob = new Blob([data.content], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = downloadFilename
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleClose = () => {
    if (data?.content?.startsWith('blob:')) {
      URL.revokeObjectURL(data.content)
    }
    onClose()
  }

  // Show download badge only for image and text (not for 'download' type)
  const showDownloadBadge = data?.type === 'image' || data?.type === 'text'

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={handleClose}>
      <div className="modal-dialog modal-lg modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content bg-dark text-light">
          <div className="modal-header border-secondary d-flex justify-content-between align-items-center">
            <h5 className="modal-title mb-0">MIME Type Viewer</h5>
            <div className="d-flex align-items-center gap-3">
              {data?.mimeType && <small className="text-secondary">{data.mimeType}</small>}
              {showDownloadBadge && (
                <button 
                  type="button" 
                  className="btn btn-outline-light btn-sm d-flex align-items-center gap-1" 
                  onClick={handleDownload}
                  title="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Download
                </button>
              )}
              <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
            </div>
          </div>
          <div className="modal-body bg-secondary bg-opacity-10" style={{ maxHeight: '50vh', overflow: 'auto' }}>
            {loading && <div className="text-center py-5"><div className="spinner-border text-light" role="status"></div></div>}
            {error && <div className="alert alert-danger">{error}</div>}
            {data?.type === 'image' && (
              <div className="text-center">
                <img src={data.content} alt={data.mimeType} style={{ maxHeight: '45vh', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
            )}
            {data?.type === 'text' && data.size <= 2 * 1024 * 1024 && (
              data.mimeType === 'text/html' ? (
                <>
                  <pre className="bg-black bg-opacity-50 p-3 rounded mb-3" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '20vh', overflow: 'auto' }}>{data.content}</pre>
                  <div className="border rounded bg-white shadow-sm" style={{ height: '25vh' }}>
                    <iframe 
                      srcDoc={data.content} 
                      title="HTML Preview"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      sandbox="allow-same-origin"
                    />
                  </div>
                </>
              ) : (
                <pre className="bg-black bg-opacity-50 p-3 rounded" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{data.content}</pre>
              )
            )}
            {(data?.type === 'download' || (data?.type === 'text' && data.size > 2 * 1024 * 1024)) && (
              <div className="text-center py-4">
                <p className="mb-3 text-light">MIME Type: {data.mimeType}</p>
                {error === 'File not found' ? (
                  <>
                    <p className="text-danger mb-3">The file does not exist.</p>
                    <button className="btn btn-primary" disabled>
                      다운로드
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={handleDownload}>
                    다운로드
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}