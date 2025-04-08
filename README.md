# CompTIA Security+ SY0-701 Practice Exam

An interactive web-based practice exam platform for the CompTIA Security+ SY0-701 certification.

![CompTIA Security+ Practice Exam]

## Features

- **Multiple Exam Modes**:
  - Full Practice Exam (90 questions, 90 minutes)
  - Quick Practice (30 questions, 30 minutes)
  - Domain-Specific Exams (focus on one domain)
  - Custom Quiz (select number of questions, domains, and time limit)
  - Missed Questions Review
  - Daily Challenge (10 questions, 10 minutes)

- **Real Exam Simulation**:
  - Timer with auto-submit
  - Question navigation
  - Flag questions for review
  - Similar format to the actual CompTIA exam

- **Detailed Results Analysis**:
  - Overall score and pass/fail status
  - Domain-by-domain performance breakdown
  - Visual charts and statistics
  - Comprehensive review of all answers

- **Progress Tracking**:
  - Save exam history
  - Track improvement over time
  - Domain strength analysis
  - Personalized study recommendations

- **Study Resources**:
  - Domain summaries
  - Security+ terminology glossary
  - External resource links

- **User Experience Features**:
  - Dark/light mode toggle
  - Mobile-responsive design
  - Save and resume exam progress
  - Export performance data

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Chart.js for data visualization
- Local storage for saving user progress
- Responsive design with Flexbox and CSS Grid
- FontAwesome icons

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- No internet connection required after initial load (except for CDN assets)

### Installation

1. Clone the repository or download the files:
   ```
   git clone https://github.com/sree-charan/comptia-sec.git
   ```

2. No build process required! Simply open `index.html` in a web browser.

3. Alternatively, host the files on any web server or static site hosting service.

### Usage

1. Open the application in your web browser
2. Navigate through the main menu to select your desired practice mode
3. Complete the practice exam
4. Review your results and track your progress over time

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - All styling for the application
- `exam.js` - Core JavaScript functionality
- `data.json` - Question database with answers and explanations

## Question Database

The `data.json` file contains all practice questions organized by domain and section. Each question includes:

- Question text
- Multiple-choice options
- Correct answer
- Detailed explanation
- Domain/section identifier

To add more questions, simply expand the JSON file following the existing structure.

## Customization

### Adding Questions

To add new questions, edit the `data.json` file using the following format:

```json
{
  "question": "What is the primary purpose of multi-factor authentication?",
  "options": [
    "To increase the complexity of passwords",
    "To provide multiple layers of security by requiring different types of authentication",
    "To eliminate the need for passwords altogether",
    "To allow multiple users to share the same account securely"
  ],
  "correctOption": "To provide multiple layers of security by requiring different types of authentication",
  "explanation": "Multi-factor authentication enhances security by requiring users to provide two or more verification factors to gain access: something they know (password), something they have (security token), or something they are (biometric verification).",
  "section": "1.2 Compare and contrast authentication methods and models",
  "difficulty": "medium"
}
```

### Modifying Styles

All styling is contained in `styles.css`. The application uses CSS variables for easy theming:

```css
:root {
  --primary-color: #0078d7;
  --secondary-color: #505050;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  /* ...more variables... */
}
```

## Browser Support

The application is compatible with:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- CompTIA for creating the Security+ certification
- FontAwesome for icons
- Google Fonts for typography
- Chart.js for visualizations

## Disclaimer

This is an unofficial practice exam and is not affiliated with or endorsed by CompTIA. All CompTIA content, products, and standards are trademarks of CompTIA. The questions are designed to help you prepare for the actual exam but do not guarantee passing the official CompTIA Security+ certification.

---

## Future Enhancements

- User accounts for cloud synchronization
- Additional practice exams and question banks
- Performance-based question simulations
- Study mode with instant feedback
- Spaced repetition algorithm for optimal learning
- Integration with study materials and resources
- Printer-friendly results for offline review

---

Created by Sree Charan with ❤️ for cybersecurity students and professionals preparing for the CompTIA Security+ certification.