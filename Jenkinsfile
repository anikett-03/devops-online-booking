pipeline {
    agent any

    environment {
        APP_NAME = 'devops-online-booking-app'
        IMAGE_TAG = "v${BUILD_NUMBER}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 15, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('Checkout Source') {
            steps {
                echo '=== Stage 1: Checking out source code ==='
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo '=== Stage 2: Installing Node.js packages ==='
                sh 'npm ci'
            }
        }

        stage('Automated Testing') {
            steps {
                echo '=== Stage 3: Running Jest test suite ==='
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo '=== Stage 4: Building Docker image ==='
                sh "docker build -t ${APP_NAME}:${IMAGE_TAG} -t ${APP_NAME}:latest ."
            }
        }

        stage('Container Health Check') {
            steps {
                echo '=== Stage 5: Verifying container health ==='
                sh "docker run -d --name test-${BUILD_NUMBER} ${APP_NAME}:${IMAGE_TAG}"
                sh 'sleep 8'
                sh "docker exec test-${BUILD_NUMBER} wget -qO- http://localhost:3000/health"
                sh "docker rm -f test-${BUILD_NUMBER}"
            }
        }

        stage('Deploy Application') {
            steps {
                echo '=== Stage 6: Deploying with Docker Compose ==='
                sh 'docker compose down || true'
                sh 'docker compose up --build -d booking-app'
                echo 'Deployed! App available at http://localhost:3000'
            }
        }
    }

    post {
        always {
            sh "docker rm -f test-${BUILD_NUMBER} || true"
            cleanWs()
        }
        success {
            echo 'SUCCESS: Pipeline completed successfully!'
        }
        failure {
            echo 'FAILURE: Check the console output above.'
        }
    }
}
