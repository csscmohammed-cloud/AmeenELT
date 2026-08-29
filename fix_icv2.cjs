const fs = require('fs');
const icvPath = '/app/applet/src/components/InteractiveCourseViewer.tsx';
let icv = fs.readFileSync(icvPath, 'utf8');

icv = icv.replace(
  `          {slide.type === 'quiz' && <QuizSlide slide={slide} onComplete={nextSlide} isLast={currentSlide === slides.length - 1} />}
        </div>
        </div>
      </div>`,
  `          {slide.type === 'quiz' && <QuizSlide slide={slide} onComplete={nextSlide} isLast={currentSlide === slides.length - 1} />}
        </div>
      </div>`
);

fs.writeFileSync(icvPath, icv);
console.log('Fixed ICV 2');
