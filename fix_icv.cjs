const fs = require('fs');
const icvPath = '/app/applet/src/components/InteractiveCourseViewer.tsx';
let icv = fs.readFileSync(icvPath, 'utf8');

// Reset and correctly place the submission button inside the main return div
icv = icv.replace(
  `        </div>
        </div>
      </div>
      {currentSlide === slides.length - 1 && (`,
  `        </div>
      </div>
      {currentSlide === slides.length - 1 && (`
);

fs.writeFileSync(icvPath, icv);
console.log('Fixed InteractiveCourseViewer');
