# Algorithm Builder App

## School Authentication And Secret Boundary
This repository is a small SecuredMe school tool. Official classroom use must not require `.env` files, API keys, raw tokens, or local model secrets. Student and teacher workflows must use Codex/OpenAI or Antigravity/Gemini through browser WebAuth, fingerprinted session approval, and encrypted local session records when authentication is needed.

The reason for excluding generic local AI routes from official school mode is student and teacher safety: education accounts, provider-side account controls, browser login, and governed AI refusal behavior are safer than unguided local model endpoints for classroom cybersecurity and algorithm-building tools.

> **Development status.** This school tool is currently tagged **pre-alpha / in development**. External PRs are not evaluated for merge until the maintained tool reaches a stable, fully functional 100% classroom release after the pre-alpha phase. Issues and forks remain allowed, but official PR review is paused until that stability gate is met.


A sophisticated algorithm visualization and development tool.

> **Official school governance.** Algorithm Builder App is for training students and teachers to build, inspect, and reason about algorithms safely. It is not a tool for theft, fraud, bypass, abuse, or criminal automation. The maintained classroom route supports Codex/OpenAI or Antigravity/Gemini only. See [SCHOOL_TOOL_GOVERNANCE.md](SCHOOL_TOOL_GOVERNANCE.md) and [AGENTS.md](AGENTS.md).

> **License.** This project uses the Secured Educational License 2.0 (`LicenseRef-SEL-2.0`). See [LICENSE](LICENSE), [NOTICE](NOTICE), and [DISCLAIMER](DISCLAIMER).

## Features

- **Core Functionality**
  - Interactive algorithm building interface
  - LaTeX mathematical expression rendering
  - Dynamic code generation
  - Step-by-step execution debugging
  - Real-time variable monitoring

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Mathematical Processing**: MathJax, mathjs
- **Infrastructure**: Docker, Nginx
- **Monitoring**: Prometheus, Grafana
- **Database**: PostgreSQL
- **Caching**: Redis

## Docker Services

- Web Application (Port 3000)
- PostgreSQL Database
- Redis Cache (Port 6379)
- Nginx Reverse Proxy (Port 80)
- Prometheus Metrics (Port 9090)
- Grafana Dashboard (Port 3001)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/algorithm-builder-app.git
```

2. Start the Docker containers:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:3000`

## Usage

1. **Mathematical Components**
   - Use the math panel to input LaTeX expressions
   - Leverage mathjs calculations for mathematical operations
   - Visualize mathematical functions

2. **Algorithm Building**
   - Drag and drop components from the palette
   - Connect components to create algorithms
   - Generate executable code automatically

3. **Debugging**
   - Step through execution
   - Monitor variable values
   - Analyze algorithm performance

4. **Neutrosophic Logic and Neutrosophic Linear Model**
   - Define Neutrosophic Components (T, I, F)
   - Implement Neutrosophic Logic Operations (negation, conjunction, disjunction, implication, equivalence)
   - Apply Neutrosophic Logic to problem solving

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## License

This project is licensed under the Secured Educational License 2.0
(`LicenseRef-SEL-2.0`). See `LICENSE`, `NOTICE`, and `DISCLAIMER`.



