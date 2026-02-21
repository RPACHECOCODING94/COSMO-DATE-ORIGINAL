#!/usr/bin/env python3
"""
Backend API Tests for Cosmo Date - Dating app based on zodiac compatibility
Tests all backend endpoints in the correct order as specified in the review request.
"""

import requests
import json
import base64
import time
from datetime import datetime, date
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Base URL from frontend .env
BASE_URL = "https://zodiac-dating-2.preview.emergentagent.com/api"

class CosmoDateAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.user1_token = None
        self.user2_token = None
        self.user1_id = None
        self.user2_id = None
        self.match_id = None
        self.ticket_id = None
        
        # Generate unique identifiers for this test run
        self.timestamp = int(time.time())
        self.user1_email = f"juan{self.timestamp}@test.com"
        self.user2_email = f"maria{self.timestamp}@test.com"
        
    def test_health_check(self):
        """Test basic health check endpoints"""
        logger.info("Testing health check endpoints...")
        
        # Test root endpoint
        response = self.session.get(f"{self.base_url}/")
        logger.info(f"Root endpoint: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Root endpoint failed: {response.status_code}"
        
        # Test health endpoint
        response = self.session.get(f"{self.base_url}/health")
        logger.info(f"Health endpoint: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Health endpoint failed: {response.status_code}"
        
        print("✅ Health check endpoints working")

    def test_user_registration(self):
        """Test user registration with various scenarios"""
        logger.info("Testing user registration...")
        
        # Generate unique identifiers for this test run
        timestamp = int(time.time())
        
        # Valid registration data for Juan (Taurus - May 15)
        valid_user1_data = {
            "full_name": "Juan Perez Garcia",
            "date_of_birth": "1995-05-15",
            "curp": f"PEGJ950515HSRNRN{timestamp%100:02d}",
            "email": self.user1_email,
            "phone": f"662123{timestamp%10000:04d}",
            "password": "Test1234",
            "profile_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            "gender": "masculino",
            "disclaimer_accepted": True
        }
        
        # Test valid registration
        response = self.session.post(f"{self.base_url}/auth/register", json=valid_user1_data)
        logger.info(f"Valid registration: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Valid registration failed: {response.text}"
        
        result = response.json()
        assert result["zodiac_sign"] == "Taurus", f"Expected Taurus, got {result['zodiac_sign']}"
        self.user1_id = result["user"]["id"]
        
        print("✅ Valid user registration working - zodiac sign calculated correctly (Taurus)")
        
        # Test duplicate CURP rejection
        response = self.session.post(f"{self.base_url}/auth/register", json=valid_user1_data)
        logger.info(f"Duplicate CURP: {response.status_code} - {response.text}")
        assert response.status_code == 400, "Duplicate CURP should be rejected"
        assert "CURP ya está registrada" in response.text, "Should indicate CURP is already registered"
        
        print("✅ Duplicate CURP rejection working")
        
        # Test age under 18 rejection
        underage_data = valid_user1_data.copy()
        underage_data["date_of_birth"] = "2010-05-15"
        underage_data["email"] = "underage@test.com"
        underage_data["curp"] = "PEGJ100515HSRNRN09"
        underage_data["phone"] = "6621234568"
        
        response = self.session.post(f"{self.base_url}/auth/register", json=underage_data)
        logger.info(f"Underage registration: {response.status_code} - {response.text}")
        assert response.status_code == 400, "Underage users should be rejected"
        assert "18 años" in response.text, "Should indicate age requirement"
        
        print("✅ Age under 18 rejection working")
        
        # Test invalid CURP format rejection
        invalid_curp_data = valid_user1_data.copy()
        invalid_curp_data["curp"] = "INVALID123"
        invalid_curp_data["email"] = "invalid@test.com"
        invalid_curp_data["phone"] = "6621234569"
        
        response = self.session.post(f"{self.base_url}/auth/register", json=invalid_curp_data)
        logger.info(f"Invalid CURP: {response.status_code} - {response.text}")
        assert response.status_code == 422, "Invalid CURP format should be rejected"
        
        print("✅ Invalid CURP format rejection working")

    def test_user_login(self):
        """Test user login and JWT token generation"""
        logger.info("Testing user login...")
        
        # Valid login
        login_data = {
            "email": self.user1_email,
            "password": "Test1234"
        }
        
        response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
        logger.info(f"Valid login: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Valid login failed: {response.text}"
        
        result = response.json()
        assert "token" in result, "JWT token should be returned"
        assert "user" in result, "User data should be returned"
        
        self.user1_token = result["token"]
        
        print("✅ User login working - JWT token generated")
        
        # Test invalid login
        invalid_login = {
            "email": self.user1_email,
            "password": "wrongpassword"
        }
        
        response = self.session.post(f"{self.base_url}/auth/login", json=invalid_login)
        logger.info(f"Invalid login: {response.status_code} - {response.text}")
        assert response.status_code == 401, "Invalid credentials should be rejected"
        
        print("✅ Invalid credentials rejection working")

    def test_get_profile(self):
        """Test getting user profile with JWT token"""
        logger.info("Testing get profile...")
        
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        response = self.session.get(f"{self.base_url}/users/profile", headers=headers)
        logger.info(f"Get profile: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Get profile failed: {response.text}"
        
        result = response.json()
        assert result["email"] == self.user1_email, "Should return correct user data"
        assert result["zodiac_sign"] == "Taurus", "Should include zodiac sign"
        assert "password" not in result, "Password should not be included"
        
        print("✅ Get profile working")

    def test_update_profile(self):
        """Test updating user profile"""
        logger.info("Testing profile update...")
        
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        update_data = {
            "bio": "Soy Juan, me gustan los tacos y la música",
            "preferred_gender": "femenino"
        }
        
        response = self.session.put(f"{self.base_url}/users/profile", json=update_data, headers=headers)
        logger.info(f"Update profile: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        
        result = response.json()
        assert result["user"]["bio"] == update_data["bio"], "Bio should be updated"
        assert result["user"]["preferred_gender"] == update_data["preferred_gender"], "Preferred gender should be updated"
        
        print("✅ Profile update working")

    def test_create_second_user(self):
        """Create second user for matching tests"""
        logger.info("Creating second user for matching tests...")
        
        # Second user data (Maria - Leo, August 5)
        user2_data = {
            "full_name": "Maria Lopez",
            "date_of_birth": "1996-08-05",
            "curp": f"LOMA960805MSRRPR{self.timestamp%100:02d}",
            "email": self.user2_email,
            "phone": f"662765{self.timestamp%10000:04d}",
            "password": "Maria123",
            "profile_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            "gender": "femenino",
            "disclaimer_accepted": True
        }
        
        response = self.session.post(f"{self.base_url}/auth/register", json=user2_data)
        logger.info(f"Second user registration: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Second user registration failed: {response.text}"
        
        result = response.json()
        assert result["zodiac_sign"] == "Leo", f"Expected Leo, got {result['zodiac_sign']}"
        self.user2_id = result["user"]["id"]
        
        # Login second user
        login_data = {
            "email": self.user2_email,
            "password": "Maria123"
        }
        
        response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
        assert response.status_code == 200, f"Second user login failed: {response.text}"
        self.user2_token = response.json()["token"]
        
        print("✅ Second user created successfully (Leo zodiac sign)")

    def test_potential_matches(self):
        """Test getting potential matches with compatibility"""
        logger.info("Testing potential matches...")
        
        headers = {"Authorization": f"Bearer {self.user1_token}"}
        response = self.session.get(f"{self.base_url}/users/potential-matches", headers=headers)
        logger.info(f"Potential matches: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Get potential matches failed: {response.text}"
        
        result = response.json()
        assert "potential_matches" in result, "Should return potential matches"
        
        # Find Maria in the matches
        maria_match = None
        for match in result["potential_matches"]:
            if match["email"] == self.user2_email:
                maria_match = match
                break
        
        assert maria_match is not None, "Maria should appear as a potential match"
        assert maria_match["zodiac_sign"] == "Leo", "Maria should be Leo"
        
        # Check Taurus-Leo compatibility (should be 73%)
        expected_compatibility = 73
        assert maria_match["compatibility"] == expected_compatibility, f"Taurus-Leo compatibility should be {expected_compatibility}%, got {maria_match['compatibility']}%"
        
        print(f"✅ Potential matches working - Taurus-Leo compatibility: {maria_match['compatibility']}%")

    def test_swipe_actions(self):
        """Test swipe actions and match creation"""
        logger.info("Testing swipe actions...")
        
        # User 1 (Juan) likes User 2 (Maria)
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        swipe_data = {
            "target_user_id": self.user2_id,
            "action": "like"
        }
        
        response = self.session.post(f"{self.base_url}/matches/swipe", json=swipe_data, headers=headers1)
        logger.info(f"User 1 likes User 2: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Swipe action failed: {response.text}"
        
        result = response.json()
        assert result["is_match"] is False, "Should not be a match yet (one-way like)"
        
        print("✅ First swipe (like) working - no match yet")
        
        # User 2 (Maria) likes User 1 (Juan) - should create match
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        swipe_data = {
            "target_user_id": self.user1_id,
            "action": "like"
        }
        
        response = self.session.post(f"{self.base_url}/matches/swipe", json=swipe_data, headers=headers2)
        logger.info(f"User 2 likes User 1: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Second swipe action failed: {response.text}"
        
        result = response.json()
        assert result["is_match"] is True, "Should create a match (mutual like)"
        assert "match_id" in result, "Should return match ID"
        assert "matched_user" in result, "Should return matched user info"
        
        self.match_id = result["match_id"]
        
        print("✅ Swipe actions working - match created successfully")

    def test_get_matches(self):
        """Test getting matches for both users"""
        logger.info("Testing get matches...")
        
        # Test for User 1
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        response = self.session.get(f"{self.base_url}/matches", headers=headers1)
        logger.info(f"User 1 matches: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Get matches failed for User 1: {response.text}"
        
        result = response.json()
        assert "matches" in result, "Should return matches list"
        assert len(result["matches"]) == 1, "Should have 1 match"
        
        match = result["matches"][0]
        assert match["match_id"] == self.match_id, "Should return correct match ID"
        assert match["user"]["email"] == self.user2_email, "Should show Maria as the match"
        
        # Test for User 2
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        response = self.session.get(f"{self.base_url}/matches", headers=headers2)
        logger.info(f"User 2 matches: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Get matches failed for User 2: {response.text}"
        
        result = response.json()
        assert len(result["matches"]) == 1, "Should have 1 match"
        match = result["matches"][0]
        assert match["user"]["email"] == self.user1_email, "Should show Juan as the match"
        
        print("✅ Get matches working for both users")

    def test_send_message(self):
        """Test sending messages in a match"""
        logger.info("Testing send message...")
        
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        message_data = {
            "match_id": self.match_id,
            "content": "¡Hola Maria! ¡Qué gusto hacer match contigo! 🌟"
        }
        
        response = self.session.post(f"{self.base_url}/messages", json=message_data, headers=headers1)
        logger.info(f"Send message: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Send message failed: {response.text}"
        
        result = response.json()
        assert "data" in result, "Should return message data"
        assert result["data"]["content"] == message_data["content"], "Should return correct message content"
        assert result["data"]["sender_id"] == self.user1_id, "Should set correct sender ID"
        
        print("✅ Send message working")

    def test_get_messages(self):
        """Test getting messages for a match"""
        logger.info("Testing get messages...")
        
        headers2 = {"Authorization": f"Bearer {self.user2_token}"}
        response = self.session.get(f"{self.base_url}/messages/{self.match_id}", headers=headers2)
        logger.info(f"Get messages: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Get messages failed: {response.text}"
        
        result = response.json()
        assert "messages" in result, "Should return messages list"
        assert len(result["messages"]) == 1, "Should have 1 message"
        
        message = result["messages"][0]
        assert message["content"] == "¡Hola Maria! ¡Qué gusto hacer match contigo! 🌟", "Should return correct message"
        assert message["sender_id"] == self.user1_id, "Should show correct sender"
        
        print("✅ Get messages working")

    def test_support_ticket(self):
        """Test support ticket creation and retrieval"""
        logger.info("Testing support tickets...")
        
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        
        # Create support ticket
        ticket_data = {
            "subject": "Problema con las notificaciones",
            "message": "No estoy recibiendo notificaciones de mensajes nuevos. Por favor ayúdenme a solucionarlo."
        }
        
        response = self.session.post(f"{self.base_url}/support/tickets", json=ticket_data, headers=headers1)
        logger.info(f"Create support ticket: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Create support ticket failed: {response.text}"
        
        result = response.json()
        assert "ticket" in result, "Should return ticket data"
        assert result["ticket"]["subject"] == ticket_data["subject"], "Should set correct subject"
        assert result["ticket"]["status"] == "open", "Should set status as open"
        
        self.ticket_id = result["ticket"]["id"]
        
        print("✅ Support ticket creation working")
        
        # Get support tickets list
        response = self.session.get(f"{self.base_url}/support/tickets", headers=headers1)
        logger.info(f"Get support tickets: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Get support tickets failed: {response.text}"
        
        result = response.json()
        assert "tickets" in result, "Should return tickets list"
        assert len(result["tickets"]) == 1, "Should have 1 ticket"
        
        ticket = result["tickets"][0]
        assert ticket["id"] == self.ticket_id, "Should return correct ticket"
        assert ticket["subject"] == ticket_data["subject"], "Should have correct subject"
        
        print("✅ Support ticket retrieval working")

    def test_date_request_premium_required(self):
        """Test date request should fail for non-premium user"""
        logger.info("Testing date request (should fail for non-premium user)...")
        
        headers1 = {"Authorization": f"Bearer {self.user1_token}"}
        date_request_data = {
            "match_id": self.match_id,
            "date_type": "cena",
            "proposed_datetime": "2025-02-15T19:00:00"
        }
        
        response = self.session.post(f"{self.base_url}/dates/request", json=date_request_data, headers=headers1)
        logger.info(f"Date request (non-premium): {response.status_code} - {response.text}")
        assert response.status_code == 403, "Date request should fail for non-premium user"
        assert "Premium" in response.text, "Should indicate this is a Premium feature"
        
        print("✅ Date request correctly rejected for non-premium user")

    def run_all_tests(self):
        """Run all tests in order"""
        try:
            print("🚀 Starting Cosmo Date Backend API Tests\n")
            print(f"Base URL: {self.base_url}\n")
            
            self.test_health_check()
            print()
            
            self.test_user_registration()
            print()
            
            self.test_user_login()
            print()
            
            self.test_get_profile()
            print()
            
            self.test_update_profile()
            print()
            
            self.test_create_second_user()
            print()
            
            self.test_potential_matches()
            print()
            
            self.test_swipe_actions()
            print()
            
            self.test_get_matches()
            print()
            
            self.test_send_message()
            print()
            
            self.test_get_messages()
            print()
            
            self.test_support_ticket()
            print()
            
            self.test_date_request_premium_required()
            print()
            
            print("🎉 ALL TESTS PASSED! 🎉")
            print("\nSummary:")
            print("✅ User Registration (with CURP validation, age check, zodiac calculation)")
            print("✅ User Login (with JWT authentication)")
            print("✅ Profile Management (get/update)")
            print("✅ Potential Matches (with zodiac compatibility)")
            print("✅ Swipe Actions (with match detection)")
            print("✅ Messaging System")
            print("✅ Support Ticket System")
            print("✅ Premium Feature Protection (Date Requests)")
            
            return True
            
        except Exception as e:
            logger.error(f"Test failed: {str(e)}")
            print(f"❌ TEST FAILED: {str(e)}")
            return False

if __name__ == "__main__":
    tester = CosmoDateAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)