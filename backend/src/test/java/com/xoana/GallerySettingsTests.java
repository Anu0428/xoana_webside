package com.xoana;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xoana.model.GalleryImage;
import com.xoana.model.SiteSettings;
import com.xoana.repository.SiteSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import java.util.stream.IntStream;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:gallery;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
class GallerySettingsTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired SiteSettingsRepository repository;

    @Test
    @WithMockUser(roles = "ADMIN")
    void savesMoreThanFiveImagesAndPersistsDeletionIncludingEmptyGallery() throws Exception {
        SiteSettings settings = new SiteSettings();
        // Exceeds both the old 5-image limit and a MySQL TEXT column's 64 KB.
        List<GalleryImage> images = IntStream.range(0, 1000)
                .mapToObj(i -> new GalleryImage("/uploads/image-" + i + ".jpg", "指板图片 " + i, "contain"))
                .toList();
        settings.setGalleryImages(images);
        save(settings);
        assertThat(repository.findById(1L).orElseThrow().getGalleryImages()).isEqualTo(images);
        mvc.perform(get("/api/settings")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.galleryImages.length()").value(1000));

        settings.setGalleryImages(images.subList(1, 3));
        save(settings);
        assertThat(repository.findById(1L).orElseThrow().getGalleryImages()).isEqualTo(images.subList(1, 3));

        settings.setGalleryImages(List.of());
        save(settings);
        assertThat(repository.findById(1L).orElseThrow().getGalleryImages()).isEmpty();
        mvc.perform(get("/api/settings")).andExpect(jsonPath("$.data.galleryImages").isEmpty());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void legacySettingsRemainReadableWithoutInitializingNewGallery() throws Exception {
        SiteSettings settings = new SiteSettings();
        settings.setGalleryImage1("/uploads/legacy.jpg");
        save(settings);
        SiteSettings loaded = repository.findById(1L).orElseThrow();
        assertThat(loaded.getGalleryImages()).isNull();
        assertThat(loaded.getGalleryImage1()).isEqualTo("/uploads/legacy.jpg");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void rejectsInvalidImageData() throws Exception {
        SiteSettings settings = new SiteSettings();
        settings.setGalleryImages(List.of(new GalleryImage("javascript:alert(1)", "invalid", "cover")));
        mvc.perform(put("/api/settings").contentType("application/json").content(mapper.writeValueAsBytes(settings)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "USER")
    void regularUsersCannotChangeGallery() throws Exception {
        mvc.perform(put("/api/settings").contentType("application/json").content("{\"galleryImages\":[]}"))
                .andExpect(status().isForbidden());
    }

    private void save(SiteSettings settings) throws Exception {
        mvc.perform(put("/api/settings").contentType("application/json").content(mapper.writeValueAsBytes(settings)))
                .andExpect(status().isOk());
    }
}
