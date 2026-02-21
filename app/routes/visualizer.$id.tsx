import { generate3DView } from "lib/ai.action";
import { Box, Download, RefreshCcw, Share2, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useRef, useState, useEffect } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { createProject, getProjectById } from "lib/puter.action";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

const Visualizer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId} = useOutletContext<AuthContext>();
  const hasInitialGenerated = useRef(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [project, setProject] = useState<DesignItem | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  const handleBack = () => navigate('/');

  const handleExport = async () => {
    if (!currentImage) return;

    try {
      const response = await fetch(currentImage);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `roomify-${id || 'render'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export image:', error);
      // TODO: surface a user-visible error toast/notification here
    }
  };

  const runGeneration = async (item: DesignItem) => {
    if(!id || !item.sourceImage) return;
    try {
      setIsProcessing(true);
      const result = await generate3DView({sourceImage: item.sourceImage});
      if(result.renderedImage) {
        setCurrentImage(result.renderedImage);

        // update the project with the rendered image
        const updatedItem = {
          ...item,
          renderedImage: result.renderedImage,
          renderedPath: result.renderedPath,
          timestamp: Date.now(),
          ownerId: item.ownerId ?? userId ?? null, // ensure ownerId is set, fallback to userId from context or null
          isPublic: item.isPublic ?? false, // default to false if not set
          };

        const saved = await createProject({ item: updatedItem, visibility: "private" });
        if(saved) {
          setProject(saved);
          setCurrentImage(saved.renderedImage || result.renderedImage); // update with any changes from save
        }
      }
    } catch (error) {
      console.error('Error generating 3D view:', error);
    } finally {
      setIsProcessing(false);
    }
  }

    useEffect(() => {
    let isMounted = true;

    const loadProject = async () => {
      if (!id) {
        setIsProjectLoading(false);
        return;
      }

      setIsProjectLoading(true);

      const fetchedProject = await getProjectById({ id });

      if (!isMounted) return;

      setProject(fetchedProject);
      setCurrentImage(fetchedProject?.renderedImage || null);
      setIsProjectLoading(false);
      hasInitialGenerated.current = false;
    };

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (
      isProjectLoading ||
      hasInitialGenerated.current ||
      !project?.sourceImage
    )
      return;

    if (project.renderedImage) {
      setCurrentImage(project.renderedImage);
      hasInitialGenerated.current = true;
      return;
    }

    hasInitialGenerated.current = true;
    void runGeneration(project);
  }, [project, isProjectLoading]);

  return (
      <div className="visualizer">
        <nav className="topbar">
          <div className="brand">
            <Box className="logo" />
            <span className="name">Roomify</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
            <X className="icon" /> Exit Editor
          </Button>
        </nav>
        <section className="content">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-meta">
                <p>Project</p>
                <h2>{project?.name || `Residence ${id}`}</h2>
                <p className="note">Created by you</p>
              </div>
              <div className="panel-actions">
                <Button size="sm" onClick={handleExport} className="export" disabled={!currentImage}>
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
                <Button size="sm" onClick={()=> {}} className="share">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
              </div>
            </div>
            <div className={`render-area ${isProcessing ? 'is-processing' : ''}`}>
              {currentImage ? (
                <img src={currentImage} alt="AI Rendered Image" className="rendered-img" />
              ) : (
                <div className="render-placeholder">
                  {project?.sourceImage && (
                    <img src={project.sourceImage} alt="Original" className="render-fallback" />
                  )}
                </div>
              )}
              {isProcessing && (
                <div className="render-overlay">
                  <div className="rendering-card">
                        <RefreshCcw className="spinner"/>
                        <span className="title">Rendering...</span>
                        <span className="subtitle">Generating your 3D visualization</span>
                  </div>
                </div>
              )}
            </div>
            </div>
            <div className="panel compare">
              <div className="panel-header">
                <p>Comparison</p>
                <h3>Before and After</h3>
              </div>
              <div className="hint">Drag to compare</div>
            <div className="compare-stage">
              {project?.sourceImage && currentImage ? (
                <ReactCompareSlider
                defaultValue={50}
                style={{ width: '100%', height: 'auto' }}
                itemOne={<ReactCompareSliderImage src={project.sourceImage} alt="before" className="compare-img"/>}
                itemTwo={<ReactCompareSliderImage src={currentImage ?? project?.renderedImage ?? undefined} alt="after" className="compare-img"/>}
                />
              ):(
                <div className="compare-fallback">
                  {!project?.sourceImage && (<img src={project?.sourceImage} alt="Before" className="compare-img"/>)}
                </div>
              )}
            </div>
              </div>
           </section>
      </div>
  );
};

export default Visualizer;
