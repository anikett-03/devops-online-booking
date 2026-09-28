pipeline {
    agent any

    environment {
        APP_NAME = 'devops-online-booking-app'
        IMAGE_TAG = "v${BUILD_NUMBER}"
        REGISTRY = 'docker.io/student'
        CONTAINER_PORT = '3000'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 15, unit: 'MINUTES')
        ansiColor('xterm')
    }

    stages {
        stage('Checkout Source') {
            steps {
                echo '=== Stage 1: Checking out latest source code from Repository ==='
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '=== Stage 2: Installing Node.js packages ==='
                sh 'npm ci'
            }
        }

        stage('Automated Testing & Quality Checks') {
            steps {
                echo '=== Stage 3: Executing Unit & Integration Test Suite (Jest) ==='
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '=== Stage 4: Containerizing application with Docker ==='
                sh "docker build -t ${APP_NAME}:${IMAGE_TAG} -t ${APP_NAME}:latest ."
            }
        }

        stage('Container Vulnerability & Health Check') {
            steps {
                echo '=== Stage 5: Verifying Container Health & Readiness ==='
                sh "docker run -d --name test-${BUILD_NUMBER} -p 3005:3000 ${APP_NAME}:${IMAGE_TAG}"
                sh 'sleep 5'
                sh 'curl --fail http://localhost:3005/health || exit 1'
                sh "docker stop test-${BUILD_NUMBER} && docker rm test-${BUILD_NUMBER}"
            }
        }

        stage('Deploy Application') {
            steps {
                echo '=== Stage 6: Deploying Multi-Container Environment via Docker Compose ==='
                sh 'docker-compose down || true'
                sh 'docker-compose up --build -d'
                echo 'Deployment successful! Application accessible at http://localhost:3000'
            }
        }
    }

    post {
        always {
            echo '=== Pipeline Execution Completed ==='
            cleanWs()
        }
        success {
            echo 'SUCCESS: DevOps Pipeline completed successfully!'
        }
        failure {
            echo 'FAILURE: Pipeline execution failed. Please inspect build output logs.'
        }
    }
}
